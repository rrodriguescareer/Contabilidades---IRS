import DemoPortal from '@/components/demo-portal';
export default async function Demonstracao({searchParams}:{searchParams:Promise<{conta?:string}>}){const params=await searchParams;return <DemoPortal testAccount={params.conta==='teste'}/>;}
