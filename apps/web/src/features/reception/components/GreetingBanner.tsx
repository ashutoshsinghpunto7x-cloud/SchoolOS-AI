const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const formatBannerDate = (): string =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const GreetingBanner = () => {
  const greeting = getGreeting();
  const date = formatBannerDate();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 py-9">
      {/* Decorative circles — very subtle */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/[0.04]" />
      <div className="pointer-events-none absolute -bottom-12 left-48 h-40 w-40 rounded-full bg-white/[0.04]" />
      <div className="pointer-events-none absolute top-8 right-40 h-20 w-20 rounded-full bg-white/[0.04]" />

      <div className="relative">
        <p className="text-sm font-medium text-blue-200/90 tracking-wide">{date}</p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl leading-tight">
          {greeting}, Anita
        </h1>

        <p className="mt-2 text-base text-blue-100/75 font-medium">
          Ready for today's work? Your students are waiting.
        </p>
      </div>
    </div>
  );
};
