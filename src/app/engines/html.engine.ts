import * as path from 'path';
import * as Handlebars from 'handlebars';

import { logger } from '../../logger';
import { HtmlEngineHelpers } from './html.engine.helpers';
import { DependenciesEngine } from './dependencies.engine';
import { ConfigurationInterface } from '../interfaces/configuration.interface';
import { FileEngine } from './file.engine';

export class HtmlEngine {
    private cache: { page: string } = {} as any;
    private compiledPage;

    private precompiledMenu;
    private compiledMobileMenu;
    private compiledMenu;

    constructor(
        configuration: ConfigurationInterface,
        dependenciesEngine: DependenciesEngine,
        private fileEngine: FileEngine = new FileEngine()
    ) {
        const helper = new HtmlEngineHelpers();
        helper.registerHelpers(Handlebars, configuration, dependenciesEngine);
    }

    public init(): Promise<void> {
        let partials = [
            'overview',
            'markdown',
            'modules',
            'module',
            'components',
            'component',
            'component-detail',
            'directives',
            'directive',
            'injectables',
            'injectable',
            'interceptor',
            'guard',
            'pipes',
            'pipe',
            'classes',
            'class',
            'interface',
            'routes',
            'index',
            'index-misc',
            'search-results',
            'search-input',
            'link-type',
            'block-method',
            'block-enum',
            'block-property',
            'block-index',
            'block-constructor',
            'block-typealias',
            'block-accessors',
            'block-input',
            'block-output',
            'coverage-report',
						'unit-test-report',
            'miscellaneous-functions',
            'miscellaneous-variables',
            'miscellaneous-typealiases',
            'miscellaneous-enumerations',
            'additional-page',
            'package-dependencies'
        ];

        return Promise.all(
            partials.map(partial => {
                return this.fileEngine
                    .get(path.resolve(__dirname + '/../src/templates/partials/' + partial + '.hbs'))
                    .then(data => Handlebars.registerPartial(partial, data));
            })
        )
            .then(() => {
                return this.fileEngine
                    .get(path.resolve(__dirname + '/../src/templates/page.hbs'))
                    .then(data => {
                        this.cache.page = data;
                        this.compiledPage = Handlebars.compile(this.cache.page, {
                            preventIndent: true,
                            strict: true
                        });
                    });
            })
            .then(() => {
                return this.fileEngine
                    .get(path.resolve(__dirname + '/../src/templates/partials/menu.hbs'))
                    .then(menuTemplate => {
                        this.precompiledMenu = Handlebars.compile(menuTemplate, {
                            preventIndent: true,
                            strict: true
                        });
                    });
            });
    }

    public renderMenu(data) {
        return this.fileEngine
            .get(path.resolve(__dirname + '/../src/templates/partials/menu.hbs'))
            .then(menuTemplate => {
                data.menu = 'normal';
                return Handlebars.compile(menuTemplate, {
                    preventIndent: true,
                    strict: true
                })({ ...data });
            });
    }

    public render(mainData: any, page: any): string {
        let o = mainData;
        (Object as any).assign(o, page);

        // let mem = process.memoryUsage();
        // console.log(`heapTotal: ${mem.heapTotal} | heapUsed: ${mem.heapUsed}`);

        return this.compiledPage({
            data: o
        });
    }

    public generateCoverageBadge(outputFolder, label, coverageData) {
        return this.fileEngine
            .get(path.resolve(__dirname + '/../src/templates/partials/coverage-badge.hbs'))
            .then(
                data => {
                    let template: any = Handlebars.compile(data);
										coverageData.label = label;
                    let result = template({
                        data: coverageData
                    });
                    let testOutputDir = outputFolder.match(process.cwd());
                    if (testOutputDir && testOutputDir.length > 0) {
                        outputFolder = outputFolder.replace(process.cwd() + path.sep, '');
                    }

                    return this.fileEngine
                        .write(outputFolder + path.sep + '/images/coverage-badge-' + label + '.svg', result)
                        .catch(err => {
                            logger.error('Error during coverage badge ' + label + ' file generation ', err);
                            return Promise.reject(err);
                        });
                },
                err => Promise.reject('Error during coverage badge generation')
            );
    }
}
