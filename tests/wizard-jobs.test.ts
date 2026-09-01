import { describe, expect, test, vi } from 'vitest';
import {
  detectJobSource,
  fetchJobPosting,
  htmlToText,
  JobImportError,
} from '../src/wizard/jobs';
import { extractJdSalary } from '../src/wizard/parse';

describe('job URL detection', () => {
  test('recognizes a hosted Greenhouse board job URL', () => {
    const src = detectJobSource('https://boards.greenhouse.io/cloudflare/jobs/7695702');
    expect(src?.provider).toBe('greenhouse');
    expect(src?.endpoint).toBe(
      'https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs/7695702',
    );
  });

  test('recognizes the job-boards.greenhouse.io host and the embedded form pattern', () => {
    const direct = detectJobSource('https://job-boards.greenhouse.io/cloudflare/jobs/7695702');
    expect(direct?.provider).toBe('greenhouse');
    const embed = detectJobSource(
      'https://job-boards.greenhouse.io/embed/job_app?for=cloudflare&token=7695702',
    );
    expect(embed?.provider).toBe('greenhouse');
    expect(embed?.endpoint).toContain('/boards/cloudflare/jobs/7695702');
  });

  test('recognizes a Lever job URL', () => {
    const src = detectJobSource(
      'https://jobs.lever.co/spotify/a0fa7da3-4c3c-4fa2-97bd-7d6eb01eb9e5',
    );
    expect(src?.provider).toBe('lever');
    expect(src?.endpoint).toBe(
      'https://api.lever.co/v0/postings/spotify/a0fa7da3-4c3c-4fa2-97bd-7d6eb01eb9e5',
    );
  });

  test('recognizes an Ashby job URL and targets the public board API', () => {
    const src = detectJobSource(
      'https://jobs.ashbyhq.com/Ashby/7458d4e9-da2e-47bd-98cb-adfda43d42b2',
    );
    expect(src?.provider).toBe('ashby');
    expect(src?.endpoint).toBe(
      'https://api.ashbyhq.com/posting-api/job-board/Ashby?includeCompensation=true',
    );
  });

  test('rejects board roots, apply paths, other companies, and garbage', () => {
    expect(detectJobSource('https://boards.greenhouse.io/cloudflare')).toBeNull();
    expect(detectJobSource('https://jobs.lever.co/spotify/apply')).toBeNull();
    expect(detectJobSource('https://www.acme.com/careers/123')).toBeNull();
    expect(detectJobSource('not a url')).toBeNull();
    expect(detectJobSource('')).toBeNull();
  });
});

describe('htmlToText', () => {
  test('strips tags, keeps line structure, and decodes entities', () => {
    const html =
      '<h2>Compensation</h2><p>$180,000 &amp;ndash; $220,000&#39;s&nbsp;range</p><script>alert(1)</script><ul><li>Remote</li></ul>';
    const text = htmlToText(html);
    expect(text).toContain('Compensation\n$180,000');
    expect(text).toContain("'s");
    expect(text).not.toContain('alert');
    expect(text).toContain('Remote');
  });

  test('handles Greenhouse double-escaped HTML in the JSON content field', () => {
    const escaped =
      '&lt;div class="content-intro"&gt;&lt;h2&gt;Compensation&lt;/h2&gt;&lt;p&gt;$100,000 - $120,000&lt;/p&gt;&lt;/div&gt;';
    const text = htmlToText(escaped);
    expect(text).not.toContain('<');
    expect(text).toContain('Compensation\n$100,000 - $120,000');
  });
});

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

describe('fetchJobPosting', () => {
  test('assembles a Greenhouse job with location and salary parsed from the description', async () => {
    // Real Greenhouse shape: content HTML arrives entity-encoded inside the JSON string.
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        title: 'Account Executive, FedCiv',
        location: { name: 'Washington DC' },
        content:
          '&lt;h2&gt;Compensation&lt;/h2&gt;&lt;p&gt;The expected salary range for this role is $269,000 - $370,000.&lt;/p&gt;',
      }),
    );
    const job = await fetchJobPosting(
      'https://boards.greenhouse.io/cloudflare/jobs/7695702',
      fetchFn as unknown as typeof fetch,
    );
    expect(job.title).toBe('Account Executive, FedCiv');
    expect(job.source).toBe('Greenhouse');
    expect(job.location).toBe('Washington DC');
    const salary = extractJdSalary(job.text);
    expect(salary).not.toBeNull();
    expect(salary?.min).toBe(269000);
    expect(salary?.max).toBe(370000);
  });

  test('assembles a Lever job from the plain description', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        text: 'Android Engineer - Advertising',
        categories: { location: 'New York, NY' },
        descriptionPlain: 'Build the next advertising platform. Salary $150k to $190k.',
      }),
    );
    const job = await fetchJobPosting(
      'https://jobs.lever.co/spotify/a0fa7da3-4c3c-4fa2-97bd-7d6eb01eb9e5',
      fetchFn as unknown as typeof fetch,
    );
    expect(job.title).toBe('Android Engineer - Advertising');
    expect(job.source).toBe('Lever');
    expect(job.text).toContain('New York, NY');
    expect(extractJdSalary(job.text)?.min).toBe(150000);
  });

  test('assembles an Ashby job matched from the public board list, with compensation', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        jobs: [
          {
            title: 'Engineering Manager - EU',
            location: 'Remote, EU',
            descriptionPlain: 'Lead a team. Compensation is $170,000 to $210,000.',
            jobUrl: 'https://jobs.ashbyhq.com/Ashby/7458d4e9-da2e-47bd-98cb-adfda43d42b2',
          },
        ],
      }),
    );
    const job = await fetchJobPosting(
      'https://jobs.ashbyhq.com/Ashby/7458d4e9-da2e-47bd-98cb-adfda43d42b2',
      fetchFn as unknown as typeof fetch,
    );
    expect(job.title).toBe('Engineering Manager - EU');
    expect(job.source).toBe('Ashby');
    expect(job.location).toBe('Remote, EU');
    expect(extractJdSalary(job.text)?.max).toBe(210000);
  });

  test('a missing board job, a 404, and a network failure give distinct honest errors', async () => {
    const notOnBoard = vi.fn().mockResolvedValue(jsonResponse({ jobs: [] }));
    await expect(
      fetchJobPosting(
        'https://jobs.ashbyhq.com/Ashby/00000000-0000-0000-0000-000000000000',
        notOnBoard as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ code: 'notfound' });

    const gone = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    await expect(
      fetchJobPosting(
        'https://jobs.lever.co/spotify/deadbeef-0000-0000-0000-000000000000',
        gone as unknown as typeof fetch,
      ),
    ).rejects.toBeInstanceOf(JobImportError);

    const down = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      fetchJobPosting(
        'https://boards.greenhouse.io/cloudflare/jobs/7695702',
        down as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ code: 'network' });
  });
});
