
// Type definitions for jspdf-autotable 3.5
// Project: https://github.com/simonbengtsson/jspdf-autotable
// Definitions by: scratchinginfo <https://github.com/scratchinginfo>
//                 Dmitry Dobrynin <https://github.com/DmitryDobrynin>
//                 Robert Fricke <https://github.com/MisterDrFrage>
//                 peacemaker <https://github.com/peacemaker>
//                 stephan-g <https://github.com/stephan-g>
//                 hongvin <https://github.com/hongvin>
//                 vooncher <https://github.com/vooncher>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.0

/*~ If you want to use this module in a generic browser context, instead of
 *~ a node environment, you can use the following syntax:
 *~
 *~     <reference types="jspdf-autotable" />
 *~
 *~ For more information, see:
 *~ https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html
 */

import { jsPDF } from 'jspdf';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        autoTableHtmlToJson: (table: HTMLElement, includeHiddenElements?: boolean) => any;
        previousAutoTable: any;
    }
}
