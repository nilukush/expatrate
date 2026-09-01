/*
 * Job posting import from the official public posting APIs of the three major
 * ATS providers. All three send Access-Control-Allow-Origin, so the fetch runs
 * in the user's browser; ExpatRate has no server and never sees the URL.
 * Verified live 1 Sep 2026: boards-api.greenhouse.io/v1, api.lever.co/v0,
 * api.ashbyhq.com/posting-api/job-board.
 */

export type JobSource = {
  provider: 'greenhouse' | 'lever' | 'ashby';
  endpoint: string;
  jobRef?: string;
  label: string;
};

export interface ImportedJob {
  title: string;
  location: string | null;
  text: string;
  source: string;
}

export type JobImportErrorCode = 'unsupported' | 'notfound' | 'network';

export class JobImportError extends Error {
  code: JobImportErrorCode;
  constructor(code: JobImportErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

const greenhouseDetail = (token: string, id: string) =>
  `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${encodeURIComponent(id)}`;

const parseUrl = (raw: string): URL | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  for (const candidate of [trimmed, `https://${trimmed}`]) {
    try {
      return new URL(candidate);
    } catch {
      // try the next form
    }
  }
  return null;
};

export function detectJobSource(raw: string): JobSource | null {
  const url = parseUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'boards.greenhouse.io' || host === 'job-boards.greenhouse.io') {
    // Direct job page: /{board}/jobs/{id}; embedded form: /embed/job_app?for={board}&token={id}
    const embedToken = url.searchParams.get('for');
    const embedJob = url.searchParams.get('token');
    if (embedToken && embedJob && host === 'job-boards.greenhouse.io') {
      return { provider: 'greenhouse', endpoint: greenhouseDetail(embedToken, embedJob), label: 'Greenhouse' };
    }
    if (segments.length === 3 && segments[1] === 'jobs') {
      const [token, , id] = segments;
      return { provider: 'greenhouse', endpoint: greenhouseDetail(token, id), label: 'Greenhouse' };
    }
    return null;
  }

  if (host === 'jobs.lever.co' && segments.length === 2) {
    const [company, id] = segments;
    if (!company || !id || id === 'apply') return null;
    return {
      provider: 'lever',
      endpoint: `https://api.lever.co/v0/postings/${encodeURIComponent(company)}/${encodeURIComponent(id)}`,
      label: 'Lever',
    };
  }

  if (host === 'jobs.ashbyhq.com' && segments.length === 2) {
    const [org, jobRef] = segments;
    if (!org || !jobRef) return null;
    return {
      provider: 'ashby',
      endpoint: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(org)}?includeCompensation=true`,
      jobRef,
      label: 'Ashby',
    };
  }

  return null;
}

const BLOCK_CLOSE = /<\/(?:p|div|li|h[1-6]|tr|section|article|ul|ol|table|blockquote)>|<br\s*\/?>/gi;
const TAG = /<[^>]+>/g;
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '-', mdash: '-', hellip: '...', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
};
const ENTITY = /&(#x?[0-9a-f]+|[a-z]+);/gi;

const decodeEntities = (text: string): string =>
  text.replace(ENTITY, (match, body: string) => {
    const named = NAMED_ENTITIES[body.toLowerCase()];
    if (named !== undefined) return named;
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (body.startsWith('#')) {
      const code = parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return match;
  });

export function htmlToText(html: string): string {
  // Greenhouse ships the description HTML entity-encoded inside the JSON string,
  // so decode once to expose real tags, strip, then decode remaining entities.
  const decoded = decodeEntities(html);
  const withoutScripts = decoded
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const withBreaks = withoutScripts.replace(BLOCK_CLOSE, '\n');
  const stripped = withBreaks.replace(TAG, '');
  return decodeEntities(stripped)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

const requestJson = async (endpoint: string, fetchFn: typeof fetch): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetchFn(endpoint, { headers: { Accept: 'application/json' } });
  } catch {
    throw new JobImportError('network');
  }
  if (!response.ok) throw new JobImportError('notfound');
  try {
    return await response.json();
  } catch {
    throw new JobImportError('network');
  }
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const assemble = (title: string, location: string | null, body: string, comp: string | null, source: string): ImportedJob => {
  const header = [title, location, comp].filter((part): part is string => Boolean(part));
  return { title, location, text: `${header.join('\n')}\n\n${body}`.trim(), source };
};

export async function fetchJobPosting(raw: string, fetchFn: typeof fetch = fetch): Promise<ImportedJob> {
  const source = detectJobSource(raw);
  if (!source) throw new JobImportError('unsupported');

  const data = record(await requestJson(source.endpoint, fetchFn));

  if (source.provider === 'greenhouse') {
    const location = record(data.location).name ?? (typeof data.location === 'string' ? data.location : null);
    const content = typeof data.content === 'string' ? data.content : '';
    return assemble(
      typeof data.title === 'string' ? data.title : '',
      typeof location === 'string' && location ? location : null,
      htmlToText(content),
      null,
      source.label,
    );
  }

  if (source.provider === 'lever') {
    const categories = record(data.categories);
    const description =
      typeof data.descriptionPlain === 'string' && data.descriptionPlain.trim()
        ? data.descriptionPlain
        : htmlToText(typeof data.description === 'string' ? data.description : '');
    const salary = record(data.salary);
    const comp =
      typeof salary.minSalary === 'number' && typeof salary.maxSalary === 'number'
        ? `Salary ${salary.minSalary} - ${salary.maxSalary} ${typeof salary.currency === 'string' ? salary.currency : ''}`.trim()
        : null;
    return assemble(
      typeof data.text === 'string' ? data.text : '',
      typeof categories.location === 'string' && categories.location ? categories.location : null,
      description,
      comp,
      source.label,
    );
  }

  // Ashby: the public per-job endpoint is authenticated, so the documented
  // public board list is fetched and the job matched by its URL reference.
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const job = jobs
    .map(record)
    .find((j) => j.id === source.jobRef || (typeof j.jobUrl === 'string' && j.jobUrl.endsWith(`/${source.jobRef}`)));
  if (!job) throw new JobImportError('notfound');
  const description =
    typeof job.descriptionPlain === 'string' && job.descriptionPlain.trim()
      ? job.descriptionPlain
      : htmlToText(typeof job.descriptionHtml === 'string' ? job.descriptionHtml : '');
  const compensation = record(job.compensation);
  const comp =
    typeof compensation.scrapeableCompensationSalarySummary === 'string' && compensation.scrapeableCompensationSalarySummary
      ? `Compensation ${compensation.scrapeableCompensationSalarySummary}`
      : null;
  return assemble(
    typeof job.title === 'string' ? job.title : '',
    typeof job.location === 'string' && job.location ? job.location : null,
    description,
    comp,
    source.label,
  );
}
