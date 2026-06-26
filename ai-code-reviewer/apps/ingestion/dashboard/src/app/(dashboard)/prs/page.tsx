import { PrList } from '@/components/pr-list';

export default function PrsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pull Requests</h1>
        <p className="mt-1 text-sm text-gray-500">Look up a PR to view its automated review.</p>
      </div>
      <PrList />
    </div>
  );
}
