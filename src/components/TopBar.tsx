
import { ConnectKitButton } from "connectkit";

export function TopBar() {
  return (
    <div className="neo-blur border-b border-border/40 sticky top-0 z-50 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-6 lg:px-8 w-full max-w-7xl mx-auto">
        <div className="text-2xl font-bold text-gradient">HeritageChain</div>
        <ConnectKitButton 
          customTheme={{
            "--ck-accent-color": "rgba(34, 197, 94, 0.4)",
            "--ck-accent-text-color": "#ffffff",
            "--ck-connectbutton-color": "#ffffff",
            "--ck-connectbutton-background": "rgba(34, 197, 94, 0.15)",
            "--ck-connectbutton-hover-background": "rgba(34, 197, 94, 0.25)",
            "--ck-connectbutton-active-background": "rgba(34, 197, 94, 0.35)",
            "--ck-border-radius": "8px",
          }}
        />
      </div>
    </div>
  );
}
