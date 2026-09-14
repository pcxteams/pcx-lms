export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">{description}</p>
    </div>
  );
}
