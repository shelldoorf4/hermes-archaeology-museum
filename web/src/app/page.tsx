import GitBlame from "@/components/GitBlame";

export const dynamic = "force-static";
export const revalidate = 3600;

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center">
      <GitBlame />
    </div>
  );
}
