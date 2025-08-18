
import type { SVGProps } from 'react';

export const AbLogo = (props: SVGProps<SVGSVGElement>) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 100 50"
        {...props}
    >
        <text 
            x="50%" 
            y="50%" 
            dominantBaseline="middle" 
            textAnchor="middle" 
            fontSize="30" 
            fontWeight="bold" 
            fill="#4A90E2"
        >
            AB
        </text>
    </svg>
);
