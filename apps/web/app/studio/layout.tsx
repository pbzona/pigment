import { Toaster } from "@pigment/ui/sonner";
import { TooltipProvider } from "@pigment/ui/tooltip";

export default function EditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TooltipProvider>
      {children}
      <Toaster position="bottom-right" theme="dark" />
    </TooltipProvider>
  );
}
