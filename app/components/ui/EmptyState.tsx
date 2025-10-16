interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
}
