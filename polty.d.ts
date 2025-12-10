// Type declarations for plotly.js-basic-dist-min
declare module 'plotly.js-basic-dist-min' {
  export interface PlotlyDataLayout {
    [key: string]: any;
  }

  export interface PlotlyConfig {
    displayModeBar?: boolean;
    responsive?: boolean;
    [key: string]: any;
  }

  export interface PlotlyHTMLElement extends HTMLElement {
    on(event: string, callback: Function): void;
    removeAllListeners(event?: string): void;
  }

  export interface Plots {
    resize(root: HTMLElement): void;
  }

  function newPlot(
    root: HTMLElement | string,
    data: any[],
    layout?: PlotlyDataLayout,
    config?: PlotlyConfig
  ): Promise<PlotlyHTMLElement>;

  function react(
    root: HTMLElement | string,
    data: any[],
    layout?: PlotlyDataLayout,
    config?: PlotlyConfig
  ): Promise<PlotlyHTMLElement>;

  function purge(root: HTMLElement | string): void;

  const Plots: Plots;

  export { newPlot, react, purge, Plots };
  export default { newPlot, react, purge, Plots };
}