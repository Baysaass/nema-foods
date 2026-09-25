declare module 'page-flip' {
  export class PageFlip {
    constructor(element: HTMLElement, setting: any);
    loadFromHTML(items: NodeListOf<Element> | HTMLElement[]): void;
    turnToPage(pageIndex: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    getPageCount(): number;
    getCurrentPageIndex(): number;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string): void;
    destroy(): void;
    update(): void;
  }
}
