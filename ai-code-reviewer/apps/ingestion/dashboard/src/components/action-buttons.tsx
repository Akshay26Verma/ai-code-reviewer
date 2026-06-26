'use client';

import { useState } from 'react';
import type { AnalyzeRequest } from '@/types';

interface ActionButtonsProps {
  prId?: number;
  repoId?: string;
  orgId?: string;
}

type Status = { ok: boolean; message: string } | null;

export function ActionButtons({ prId, repoId, orgId }: ActionButtonsProps) {
  const [analyzeStatus, setAnalyzeStatus] = useState<Status>(null);
  const [reindexStatus, setReindexStatus] = useState<Status>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<AnalyzeRequest>>({
    pr_id: prId,
    repo_id: repoId ?? '',
    org_id: orgId ?? '',
    base_ref: 'main',
    head_ref: '',
    changed_files: [],
  });

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setAnalyzeStatus(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          changed_files: typeof form.changed_files === 'string'
            ? (form.changed_files as string).split(',').map((f) => f.trim()).filter(Boolean)
            : form.changed_files,
        }),
      });
      setAnalyzeStatus({
        ok: res.ok,
        message: res.ok ? 'Review queued successfully.' : `Failed (HTTP ${res.status}).`,
      });
    } catch {
      setAnalyzeStatus({ ok: false, message: 'Network error.' });
    }
    setShowForm(false);
  }

  async function handleReindex() {
    if (!repoId) return;
    setReindexStatus(null);
    try {
      const res = await fetch(`/api/index/${encodeURIComponent(repoId)}`, { method: 'POST' });
      setReindexStatus({
        ok: res.ok,
        message: res.ok ? 'Reindex started.' : `Failed (HTTP ${res.status}).`,
      });
    } catch {
      setReindexStatus({ ok: false, message: 'Network error.' });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          {showForm ? 'Cancel' : 'Request Review'}
        </button>

        {repoId && (
          <button
            onClick={handleReindex}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reindex Repo
          </button>
        )}
      </div>

      {analyzeStatus && (
        <p className={`text-sm ${analyzeStatus.ok ? 'text-green-600' : 'text-red-600'}`}>
          {analyzeStatus.message}
        </p>
      )}
      {reindexStatus && (
        <p className={`text-sm ${reindexStatus.ok ? 'text-green-600' : 'text-red-600'}`}>
          {reindexStatus.message}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleAnalyze}
          className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
          <h3 className="text-sm font-semibold text-gray-900">Request Manual Review</h3>

          <FormRow
            label="PR ID"
            type="number"
            value={String(form.pr_id ?? '')}
            onChange={(v) => setForm((f) => ({ ...f, pr_id: Number(v) }))}
            required
          />
          <FormRow
            label="Repo ID"
            value={form.repo_id ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, repo_id: v }))}
            required
          />
          <FormRow
            label="Org ID"
            value={form.org_id ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, org_id: v }))}
            required
          />
          <FormRow
            label="Base ref"
            value={form.base_ref ?? 'main'}
            onChange={(v) => setForm((f) => ({ ...f, base_ref: v }))}
            required
          />
          <FormRow
            label="Head ref"
            value={form.head_ref ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, head_ref: v }))}
            required
          />
          <FormRow
            label="Changed files (comma-separated)"
            value={Array.isArray(form.changed_files) ? form.changed_files.join(', ') : ''}
            onChange={(v) => setForm((f) => ({ ...f, changed_files: v as unknown as string[] }))}
          />

          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}

function FormRow({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-xs font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
      />
    </div>
  );
}
