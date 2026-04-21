import { Eta } from 'eta'
import path from 'node:path'
import type {
  GuardianReportViewModel,
  ReportTemplateRendererPort,
} from '../../core/ports/report-template-renderer.port'

export type HtmlTemplateRendererAdapterOptions = {
  templatesPath?: string
  templateName?: string
  useCache?: boolean
}

export class HtmlTemplateRendererAdapter implements ReportTemplateRendererPort {
  private readonly eta: Eta
  private readonly templateName: string

  constructor(options: HtmlTemplateRendererAdapterOptions = {}) {
    const templatesPath =
      options.templatesPath ??
      path.resolve(process.cwd(), 'source/infra/report/templates')

    this.templateName = options.templateName ?? 'guardian-report.eta'

    this.eta = new Eta({
      views: templatesPath,
      cache: options.useCache ?? false,
      autoEscape: true,
      autoTrim: false,
    })
  }

  public async render(viewModel: GuardianReportViewModel): Promise<string> {
    try {
      const html = await this.eta.renderAsync(this.templateName, viewModel)

      if (!html.trim()) {
        throw new Error(
          `A renderização do template "${this.templateName}" retornou HTML vazio.`,
        )
      }

      return html
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Falha ao renderizar report HTML: ${error.message}`)
      }

      throw new Error('Falha ao renderizar report HTML.')
    }
  }
}
