import MarkdownIt from "markdown-it";
import YAML from "yaml";

export interface MarkdownOptions {
    externalLink: boolean;
    extractParagraph: boolean;
    html?: boolean;
}

const defaultOptions: MarkdownOptions = {
    externalLink: true,
    extractParagraph: false
}

export type YAMLReturnType = Record<string, any> | string | number | boolean | null;

export class Markdown {
    protected readonly _mdit: MarkdownIt;
    protected readonly opts: MarkdownOptions;

    constructor(options?: Partial<MarkdownOptions>) {
        this.opts = Object.assign({}, defaultOptions, options);
        this._mdit = MarkdownIt({ html: this.opts.html });
        this.apply();
    }

    public get mdit() {
        return this._mdit;
    }

    protected apply() {
        const opts = this.opts;

        this.mdit.renderer.rules["link_open"] = function (tokens, idx, options, _, self) {
            let href = tokens[idx].attrGet('href');
            if (href) {
                let external = opts.externalLink
                if (href.startsWith('#')) external = false;
                if (href.startsWith('!')) {
                    external = true;
                    href = href.slice(1);
                }
                if (href.startsWith('~')) {
                    external = false;
                    href = href.slice(1);
                }

                tokens[idx].attrSet('href', href);
                if (external) {
                    tokens[idx].attrSet('target', '_blank');
                } else {
                    tokens[idx].attrSet('target', '_self');
                }
            }
            if (!href && tokens[idx].attrs !== null) {
                // remove href attribute
                tokens[idx].attrs = tokens[idx].attrs.filter(attr => attr[0] !== 'href');
            }
            return self.renderToken(tokens, idx, options);
        }

        if (opts.extractParagraph) {
            // when meet text , wrap with <span> tag
            this.mdit.renderer.rules["text"] = function (tokens, idx) {
                return `<span>${tokens[idx].content}</span>`;
            }
            // extract things in <p> tag
            this.mdit.renderer.rules["paragraph_open"] = function () {
                return '';
            }
            this.mdit.renderer.rules["paragraph_close"] = function () {
                return '';
            }
        }
    }

    protected static extractFrontMatter(text: string) {
        let fm_text = '';
        if (text.startsWith('---\n')) {
            const end = text.indexOf('\n---\n');
            if (end !== -1) {
                fm_text = text.slice(4, end);
                text = text.slice(end + 5);
            }
        }
        return { fm_text, text }
    }

    public static isYamlRecord<T extends Record<string, any> = Record<string, any>>(obj: any): obj is T {
        if (typeof obj !== 'object' || obj === null) return false;
        return true;
    }

    static parse(text: string) {
        const r = this.extractFrontMatter(text);
        return {
            frontmatter: YAML.parse(r.fm_text) as YAMLReturnType,
            content: r.text
        }
    }

    parse(text: string) {
        return Markdown.parse(text);
    }

    /**
     *
     * @param fm
     *  If `true`, the output will abondon the front matter.
     *  If `false`, the output will treat the front matter as normal text.
     */
    render(text: string, fm = true) {
        let t = fm ? Markdown.extractFrontMatter(text).text : text;
        return this.mdit.render(t);
    }
}

export default Markdown;