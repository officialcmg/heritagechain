
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Clock, GitFork, Terminal } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Beneficiaries", href: "/beneficiaries", icon: Users },
  { name: "Triggers", href: "/triggers", icon: Clock },
  { name: "Legacy Status", href: "/status", icon: GitFork },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
      <div className="neo-blur border-r flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <span className="text-3xl font-bold text-gradient">HeritageChain</span>
        </div>
        <nav className="flex flex-1 flex-col">
          <div className="mb-4">
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Main Navigation
            </div>
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      item.href === location.pathname
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border-transparent",
                      "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold border"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        item.href === location.pathname ? "text-primary" : ""
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-auto pb-8">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="text-primary w-4 h-4" />
                <span className="text-xs font-semibold text-primary">LEGACY NOTE</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your digital assets deserve protection. Set up your legacy plan today to secure your digital future.
              </p>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
