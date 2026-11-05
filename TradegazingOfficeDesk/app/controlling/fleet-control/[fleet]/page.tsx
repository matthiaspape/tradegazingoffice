import { notFound } from 'next/navigation';
import { FleetDetail } from '../FleetControl';
import { demoFleets } from '../demo-data';

type Props = { params: Promise<{ fleet: string }> };

export async function generateMetadata({ params }: Props) {
  const { fleet } = await params;
  const name = demoFleets.find(entry => entry.id === fleet)?.name;
  return { title: name ? `${name} · Fleet Control · Tradegazing Office Desk` : 'Fleet Control · Tradegazing Office Desk' };
}

export default async function Page({ params }: Props) {
  const { fleet } = await params;
  const entry = demoFleets.find(candidate => candidate.id === fleet);
  if (!entry) notFound();
  return <FleetDetail fleet={entry} />;
}
