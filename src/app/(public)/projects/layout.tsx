import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'See real PaxBespoke installations. Before & after transformations across Budget, PaxBespoke, and Select packages.',
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
