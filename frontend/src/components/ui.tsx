import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "light"; size?: "sm" | "md" | "lg"; icon?: ReactNode };
export function Button({ variant = "primary", size = "md", icon, className = "", children, ...props }: ButtonProps) {
  return <button className={`inline-flex items-center justify-center gap-2 select-none transition-all button button-${variant} button-${size} ${className}`} {...props}>{children}{icon}</button>;
}

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`border bg-white card ${className}`} {...props}>{children}</section>;
}

export function Badge({ className = "", children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`inline-flex items-center whitespace-nowrap badge ${className}`} {...props}>{children}</span>;
}

export function PanelHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="panel-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}

export function LoadingState({ label = "Loading analytical results" }: { label?: string }) {
  return <div className="state-card"><LoaderCircle className="spin" size={21} /><span>{label}</span></div>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="state-card state-error"><span>{message}</span><Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={retry}>Try again</Button></div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="state-card state-empty"><strong>{title}</strong><span>{detail}</span></div>;
}

export function DataState({ loading, error, retry, title, detail, children }: { loading: boolean; error: string | null; retry: () => void; title: string; detail: string; children: ReactNode }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={retry} />;
  if (!children) return <EmptyState title={title} detail={detail} />;
  return <>{children}</>;
}
