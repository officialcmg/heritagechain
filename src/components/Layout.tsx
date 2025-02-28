
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="starry-background"></div>
      <TopBar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:pl-72 pt-6 pb-12 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
