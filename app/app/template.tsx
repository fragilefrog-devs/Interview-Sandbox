/** Templates remount on every navigation, which replays this short fade between dashboard pages. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
