import type { ReactNode, SVGProps } from 'react';

function Svg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      width={20}
      height={20}
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlaneIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M10.5 13.5 4 12l-1-2 7-1.5L14.5 4c.6-.6 1.6-.6 2.2 0s.6 1.6 0 2.2L12.5 10.5 14 17.5l-2 1-1.5-5Z" transform="rotate(45 12 12)" /></Svg>;
}
export function BedIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><>
    <path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" />
    <circle cx="7" cy="11" r="1.6" />
  </></Svg>;
}
export function BusIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><>
    <rect x="4" y="3.5" width="16" height="13" rx="2.5" />
    <path d="M4 11h16M7.5 20v-3.5M16.5 20v-3.5" />
    <circle cx="8" cy="14" r=".6" fill="currentColor" />
    <circle cx="16" cy="14" r=".6" fill="currentColor" />
  </></Svg>;
}
export function WalkIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><>
    <circle cx="13" cy="4.5" r="1.7" />
    <path d="m9 21 2.2-6-2-2.2 1.3-4.3 3.2 2.5 2.8.8M11.2 15l3 1.5.8 4.5M10.5 8.5 8 11" />
  </></Svg>;
}
export function CarIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><>
    <path d="M5 16.5V13l1.8-5a2 2 0 0 1 1.9-1.3h6.6a2 2 0 0 1 1.9 1.3L19 13v3.5M3.5 13h17v3.5h-17Z" />
    <circle cx="7.5" cy="16.5" r="1.6" />
    <circle cx="16.5" cy="16.5" r="1.6" />
  </></Svg>;
}
export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
}
export function ArrowUpRightIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M7 17 17 7M8 7h9v9" /></Svg>;
}
export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M12 5v14M5 12h14" /></Svg>;
}
export function XIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="m6 6 12 12M18 6 6 18" /></Svg>;
}
export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
}
export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><>
    <path d="M12 3.5 2.8 19.5h18.4Z" />
    <path d="M12 10v4.5M12 17.4v.1" />
  </></Svg>;
}
export function PinIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.4" />
  </></Svg>;
}
export function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5Z" />
  </></Svg>;
}
export function MinusIcon(props: SVGProps<SVGSVGElement>) {
  return <Svg {...props}><path d="M5 12h14" /></Svg>;
}
