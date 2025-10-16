interface Event {
  id: string;
  messageRedacted: string;
  occurredAt: string;
}

interface Props {
  events: Event[];
}

export function EventTimeline({ events }: Props) {
  if (!events.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No tracking updates yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Tracking Updates</h3>
      <div className="space-y-4">
        {events.map(event => {
          const date = new Date(event.occurredAt);
          return (
            <div key={event.id} className="flex">
              <div className="flex-shrink-0 w-24 text-sm text-gray-600">
                {date.toLocaleDateString()}
                <br />
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex-1 ml-4">
                <p className="text-gray-900">{event.messageRedacted}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
