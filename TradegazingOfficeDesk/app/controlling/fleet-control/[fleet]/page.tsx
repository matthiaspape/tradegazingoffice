import FleetControl from '../FleetControl';

type Props = { params: Promise<{ fleet: string }> };

export async function generateMetadata({ params }: Props) {
  const { fleet } = await params;
  return { title: 'Flottendetail · Fleet Control · Tradegazing Office Desk' };
}

export default async function Page({ params }: Props) {
  const { fleet } = await params;
  return <FleetControl fleetId={fleet} />;
}
