import FleetControl from '../../fleet-control/FleetControl';
export const metadata={title:'VPS-Detail · Tradegazing Office Desk'};
export default async function Page({params}:{params:Promise<{vps:string}>}) {
 const {vps}=await params;
 return <FleetControl vpsId={vps}/>;
}
