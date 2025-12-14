export type JobStatus = "processing" | "completed" | "failed";

export interface JobDto {
  id: string;
  createdAt: string;
  fileName: string | null;
  optionId: string;
  status: JobStatus;
  duration: string | null;
  error: string | null;
  resultPath: string | null;
}

export interface JobListDto {
  items: JobDto[];
  limit: number;
  offset: number;
}

export interface JobResultDto {
  jobId: string;
  createdAt: string;
  audioPath: string;
  transcript: string;
  segments?: Array<{ start: number | null; end: number | null; text: string }>;
  deliverable: string;
  insights?: {
    session_overview: string[];
    core_relationship_dynamics_observed: string[];
    expressed_needs_and_concerns_as_heard: string[];
    moments_of_alignment_understanding_or_repair: string[];
    reflective_questions_for_consideration: string[];
  };
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8000";

async function jsonOrThrow(res: Response) {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const detail = data?.detail || res.statusText || "Request failed";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

export async function createJob(params: {
  file: File;
  optionId: string;
  sourceId?: string;
}): Promise<JobDto> {
  const fd = new FormData();
  fd.append("audio_file", params.file);
  fd.append("option_id", params.optionId);
  if (params.sourceId) fd.append("source_id", params.sourceId);

  const res = await fetch(`${API_BASE}/api/jobs`, { method: "POST", body: fd });
  return (await jsonOrThrow(res)) as JobDto;
}

export async function listJobs(limit = 50, offset = 0): Promise<JobListDto> {
  const res = await fetch(`${API_BASE}/api/jobs?limit=${limit}&offset=${offset}`);
  return (await jsonOrThrow(res)) as JobListDto;
}

export async function getJob(jobId: string): Promise<JobDto> {
  const res = await fetch(`${API_BASE}/api/jobs/${encodeURIComponent(jobId)}`);
  return (await jsonOrThrow(res)) as JobDto;
}

export async function getJobResult(jobId: string): Promise<JobResultDto> {
  const res = await fetch(`${API_BASE}/api/jobs/${encodeURIComponent(jobId)}/result`);
  return (await jsonOrThrow(res)) as JobResultDto;
}


