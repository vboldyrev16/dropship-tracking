import { Form } from '@remix-run/react';

export function TrackingHeader() {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <Form method="get" action="/apps/track" className="flex gap-2">
        <input
          type="text"
          name="query"
          placeholder="Enter tracking number"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Track
        </button>
      </Form>
    </div>
  );
}
