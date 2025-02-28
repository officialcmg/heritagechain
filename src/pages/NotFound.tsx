
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <h2 className="text-4xl font-bold text-gradient">404</h2>
      <h3 className="mt-4 text-xl font-semibold">Page not found</h3>
      <p className="mt-2 text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="neo-blur green-glow mt-8 bg-black/50 hover:bg-black/70">
        <Link to="/">Go back home</Link>
      </Button>
    </div>
  );
}
