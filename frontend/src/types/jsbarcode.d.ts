declare module 'jsbarcode' {
  interface JsBarcodeOptions {
    format?: string
    width?: number
    height?: number
    displayValue?: boolean
    fontSize?: number
    margin?: number
    background?: string
    lineColor?: string
    text?: string
    textAlign?: string
    textPosition?: string
    textMargin?: number
    fontOptions?: string
    font?: string
    valid?: (valid: boolean) => void
  }

  function JsBarcode(
    element: string | HTMLCanvasElement | HTMLImageElement | SVGSVGElement,
    value: string,
    options?: JsBarcodeOptions
  ): void

  export default JsBarcode
}
