import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FileText, 
  Copy, 
  Download, 
  Trash2, 
  Eye, 
  Edit3, 
  Github, 
  Maximize2, 
  Minimize2,
  Check,
  PanelLeft,
  ChevronRight,
  Search,
  X,
  RefreshCw,
  Replace,
  Code,
  FileDown,
  Link,
  Image as ImageIcon,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  ChevronsDownUp,
  ChevronsUpDown,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { marked } from 'marked';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Transaction, Compartment } from '@codemirror/state';
import { markdown as markdownLang } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { foldAll, unfoldAll } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
// @ts-ignore
import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';
import { cn } from './lib/utils';

const DEFAULT_MARKDOWN = `# Welcome to your Markdown Scratchpad!

This is a no-nonsense, split-screen editor for quick drafts. 

## Features
- **Live Preview**: See your changes instantly.
- **GFM Support**: GitHub Flavored Markdown (tables, task lists, etc.)
- **Persistent**: Your work is saved to local storage.
- **Clean UI**: Focus on what matters.

### Examples

**Task List:**
- [x] Write code
- [ ] Take over the world
- [ ] Get a coffee

**Table:**
| Tool | Purpose | Speed |
| :--- | :--- | :--- |
| Scratchpad | Quick Drafts | Fast |
| IDE | Heavy Work | Slow |

**Code Block:**
\`\`\`javascript
function hello() {
  console.log("Hello, Markdown!");
}
\`\`\`

> "Markdown is the easiest way to write for the web."

Enjoy drafting your READMEs and comments!
`;

export default function App() {
  const [markdown, setMarkdown] = useState<string>(() => {
    const saved = localStorage.getItem('markdown_scratchpad_content');
    return saved !== null ? saved : DEFAULT_MARKDOWN;
  });
  const [isCopied, setIsCopied] = useState(false);
  const [isHtmlCopied, setIsHtmlCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('markdown_theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const editorParentRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());

  const getBaseTheme = (currentTheme: 'light' | 'dark') => EditorView.theme({
    "&": { height: "100%", fontSize: "14px", backgroundColor: currentTheme === 'dark' ? "#0f172a" : "#ffffff" },
    ".cm-scroller": { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
    ".cm-content": { padding: "32px 0", color: currentTheme === 'dark' ? "#ffffff" : "#000000" },
    ".cm-gutters": { 
       backgroundColor: currentTheme === 'dark' ? "#0f172a" : "#ffffff", 
       borderRight: currentTheme === 'dark' ? "1px solid #1e293b" : "1px solid #000000", 
       color: currentTheme === 'dark' ? "#ffffff" : "#000000" 
    },
    "&.cm-focused": { outline: "none" }
  });

  useEffect(() => {
    if (!editorParentRef.current) return;

    const startState = EditorState.create({
      doc: markdown,
      extensions: [
        basicSetup,
        themeCompartment.current.of([
          theme === 'dark' ? oneDark : [],
          getBaseTheme(theme)
        ]),
        markdownLang(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setMarkdown(update.state.doc.toString());
          }
          
          // Handle selection changes (clicks/caret moves)
          if (update.selectionSet && previewContainerRef.current) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const totalLines = update.state.doc.lines;
            
            // Simple percentage-based scroll sync
            const scrollPercent = (line.number - 1) / (totalLines - 1 || 1);
            const preview = previewContainerRef.current;
            
            preview.scrollTo({
              top: scrollPercent * (preview.scrollHeight - preview.clientHeight),
              behavior: 'smooth'
            });
          }
        })
      ]
    });

    const view = new EditorView({
      state: startState,
      parent: editorParentRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []); // Only run once on mount

  useEffect(() => {
    // Sync external markdown changes back to editor (e.g. from clear or snippets)
    // but only if it's different to avoid loops
    if (viewRef.current && viewRef.current.state.doc.toString() !== markdown) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: markdown }
      });
    }
  }, [markdown]);

  useEffect(() => {
    setSaveStatus('saving');
    localStorage.setItem('markdown_scratchpad_content', markdown);
    const timeout = setTimeout(() => {
      setSaveStatus('saved');
    }, 800);
    return () => clearTimeout(timeout);
  }, [markdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  useEffect(() => {
    localStorage.setItem('markdown_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Update CodeMirror theme dynamically
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.current.reconfigure([
          theme === 'dark' ? oneDark : [],
          getBaseTheme(theme)
        ])
      });
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleReplace = () => {
    if (!searchQuery) return;
    setMarkdown(prev => prev.replace(searchQuery, replaceQuery));
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    // Basic escape for regex if we wanted it global, but simple string replace works for one or all
    // To replace ALL without a global regex, we can use split/join
    setMarkdown(prev => prev.split(searchQuery).join(replaceQuery));
  };

  const insertSnippet = (before: string, after: string = '') => {
    const view = viewRef.current;
    if (!view) return;

    const selection = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(selection.from, selection.to);
    const replacement = before + selectedText + after;

    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: replacement },
      selection: { anchor: selection.from + before.length, head: selection.from + before.length + selectedText.length }
    });
    
    view.focus();
  };

  const handleFoldAll = () => {
    if (viewRef.current) {
      foldAll(viewRef.current);
    }
  };

  const handleUnfoldAll = () => {
    if (viewRef.current) {
      unfoldAll(viewRef.current);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([markdown], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = "scratchpad.md";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportHtml = async () => {
    const html = await marked.parse(markdown);
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Markdown</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.5; word-wrap: break-word; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #24292e; }
        pre { background-color: #f6f8fa; border-radius: 6px; padding: 16px; overflow: auto; font-family: monospace; }
        code { background-color: rgba(27, 31, 35, 0.05); border-radius: 3px; padding: 0.2em 0.4em; font-family: monospace; }
        blockquote { border-left: 0.25em solid #dfe2e5; color: #6a737d; margin: 0; padding: 0 1em; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
        table th, table td { border: 1px solid #dfe2e5; padding: 6px 13px; }
        table tr:nth-child(2n) { background-color: #f6f8fa; }
        h1, h2, h3 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        img { max-width: 100%; }
        hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #e1e4e8; border: 0; }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
    const element = document.createElement("a");
    const file = new Blob([fullHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = "scratchpad.html";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyHtml = async () => {
    try {
      const html = await marked.parse(markdown);
      await navigator.clipboard.writeText(html);
      setIsHtmlCopied(true);
      setTimeout(() => setIsHtmlCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy HTML!', err);
    }
  };

  const handleExportPdf = () => {
    const element = document.getElementById('markdown-preview');
    if (!element) {
      console.error('Markdown preview element not found');
      return;
    }

    if (!html2pdf) {
      console.error('html2pdf library is not loaded correctly');
      return;
    }

    const opt = {
      margin:       0.5,
      filename:     'scratchpad.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true,
        backgroundColor: theme === 'dark' ? '#090e1a' : '#ffffff'
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your scratchpad?')) {
      setMarkdown('');
    }
  };

  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const charCount = markdown.length;

  return (
    <div className={cn(
      "flex flex-col h-screen overflow-hidden font-sans transition-colors duration-300",
      theme === 'dark' ? "bg-[#020617] text-white theme-dark" : "bg-white text-black theme-light",
      theme
    )}>
      {/* Header */}
      <header className={cn(
        "flex items-center justify-between px-6 py-3 border-b shrink-0 z-10 shadow-sm transition-all",
        theme === 'dark' ? "bg-[#020617] border-slate-800" : "bg-white border-black"
      )}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-lg italic select-none">
              M
            </div>
            <span className={cn(
              "font-bold tracking-tight",
              theme === 'dark' ? "text-white" : "text-black"
            )}>Scratchpad.md</span>
          </div>
          
          <nav className={cn(
            "hidden lg:flex items-center gap-4 text-sm font-bold border-l pl-6",
            theme === 'dark' ? "text-white border-slate-700" : "text-black border-black"
          )}>
            <button 
              onClick={() => setViewMode('edit')}
              className={cn(
                "py-1 px-1 transition-colors",
                viewMode === 'edit' ? (theme === 'dark' ? "text-indigo-400 border-b-2 border-indigo-400" : "text-black border-b-2 border-black") : (theme === 'dark' ? "hover:text-white" : "hover:text-black")
              )}
            >
              Editor
            </button>
            <button 
              onClick={() => setViewMode('preview')}
              className={cn(
                "py-1 px-1 transition-colors",
                viewMode === 'preview' ? (theme === 'dark' ? "text-indigo-400 border-b-2 border-indigo-400" : "text-black border-b-2 border-black") : (theme === 'dark' ? "hover:text-white" : "hover:text-black")
              )}
            >
              Preview
            </button>
            <button 
              onClick={() => setViewMode('split')}
              className={cn(
                "py-1 px-1 transition-colors",
                viewMode === 'split' ? (theme === 'dark' ? "text-indigo-400 border-b-2 border-indigo-400" : "text-black border-b-2 border-black") : (theme === 'dark' ? "hover:text-white" : "hover:text-black")
              )}
            >
              Split View
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={cn(
              "p-2 rounded-lg transition-all",
              theme === 'dark' ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-black text-white hover:bg-slate-800"
            )}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className={cn(
            "hidden sm:block text-xs font-bold px-2 py-1 border rounded",
            theme === 'dark' ? "text-white bg-slate-800 border-slate-700" : "text-black bg-white border-black"
          )}>
            UTF-8
          </div>
          <button 
            id="copy-btn"
            onClick={handleCopy}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded font-medium text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm active:transform active:scale-95"
          >
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
            {isCopied ? 'Copied' : 'Copy MD'}
          </button>
          <button 
            id="copy-html-btn"
            onClick={handleCopyHtml}
            className={cn(
              "hidden xl:flex px-4 py-1.5 border rounded font-bold text-sm transition-all items-center gap-2 shadow-sm active:transform active:scale-95",
              theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" : "bg-white border-black text-black hover:bg-slate-50"
            )}
          >
            {isHtmlCopied ? <Check size={14} className="text-green-600" /> : <Code size={14} />}
            {isHtmlCopied ? 'Copied' : 'Copy HTML'}
          </button>
          <div className={cn(
            "flex items-center gap-1 border rounded-lg p-0.5 shadow-sm",
            theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-black"
          )}>
            <button 
              id="export-md-btn"
              onClick={handleDownload}
              className={cn(
                "px-3 py-1 rounded font-bold text-xs transition-all flex items-center gap-1.5",
                theme === 'dark' ? "text-white hover:text-indigo-400 hover:bg-slate-700" : "text-black hover:bg-slate-100"
              )}
              title="Download Markdown"
            >
              <Download size={12} />
              MD
            </button>
            <div className={cn("w-[1px] h-3", theme === 'dark' ? "bg-slate-700" : "bg-black")}></div>
            <button 
              id="export-html-btn"
              onClick={handleExportHtml}
              className={cn(
                "px-3 py-1 rounded font-bold text-xs transition-all flex items-center gap-1.5",
                theme === 'dark' ? "text-white hover:text-indigo-400 hover:bg-slate-700" : "text-black hover:bg-slate-100"
              )}
              title="Download HTML"
            >
              <FileText size={12} />
              HTML
            </button>
            <div className={cn("w-[1px] h-3", theme === 'dark' ? "bg-slate-700" : "bg-black")}></div>
            <button 
              id="export-pdf-btn"
              onClick={handleExportPdf}
              className={cn(
                "px-3 py-1 rounded font-bold text-xs transition-all flex items-center gap-1.5",
                theme === 'dark' ? "text-white hover:text-indigo-400 hover:bg-slate-700" : "text-black hover:bg-slate-100"
              )}
              title="Download PDF"
            >
              <FileDown size={12} />
              PDF
            </button>
          </div>
          <button
            onClick={() => setIsSearchOpen(prev => !prev)}
            className={cn(
              "p-2 rounded-lg transition-all",
              isSearchOpen 
                ? (theme === 'dark' ? "bg-indigo-900/50 text-white" : "bg-black text-white") 
                : (theme === 'dark' ? "text-white hover:bg-slate-700" : "text-black hover:bg-slate-100")
            )}
            title="Find & Replace (Ctrl+F)"
          >
            <Search size={18} />
          </button>
          <button
            id="clear-btn"
            onClick={handleClear}
            className={cn(
              "p-2 rounded-lg transition-all",
              theme === 'dark' ? "text-white hover:text-red-400 hover:bg-red-900/20" : "text-black hover:bg-red-50"
            )}
            title="Clear Scratchpad"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Editor Side */}
        <AnimatePresence mode="wait">
          {(viewMode === 'split' || viewMode === 'edit') && (
            <motion.section 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "h-full flex flex-col border-r transition-colors duration-300",
                viewMode === 'split' ? "w-1/2" : "w-full",
                theme === 'dark' ? "bg-[#0f172a] border-slate-700" : "bg-slate-50 border-slate-200"
              )}
            >
              <div className={cn(
                "flex items-center justify-between px-4 py-2 border-b text-[11px] font-bold uppercase tracking-wider select-none",
                theme === 'dark' ? "bg-[#111827] border-slate-800 text-slate-400" : "bg-slate-200 border-slate-400 text-black"
              )}>
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "flex items-center gap-2 pr-4 border-r",
                    theme === 'dark' ? "border-slate-700 text-white" : "border-black text-black"
                  )}>
                    <Edit3 size={12} className={theme === 'dark' ? "text-white" : "text-black"} />
                    Markdown Editor
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => insertSnippet('**', '**')}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === 'dark' ? "hover:bg-slate-700 text-white" : "hover:bg-slate-300 text-black"
                      )}
                      title="Bold"
                    >
                      <Bold size={14} />
                    </button>
                    <button 
                      onClick={() => insertSnippet('*', '*')}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === 'dark' ? "hover:bg-slate-700 text-white" : "hover:bg-slate-300 text-black"
                      )}
                      title="Italic"
                    >
                      <Italic size={14} />
                    </button>
                    <div className={cn("w-[1px] h-3 mx-1", theme === 'dark' ? "bg-slate-700" : "bg-black")}></div>
                    <button 
                      onClick={() => insertSnippet('[', '](url)')}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === 'dark' ? "hover:bg-slate-700 text-white" : "hover:bg-slate-300 text-black"
                      )}
                      title="Insert Link"
                    >
                      <Link size={14} />
                    </button>
                    <button 
                      onClick={() => insertSnippet('![alt text](', ')')}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === 'dark' ? "hover:bg-slate-700 text-white" : "hover:bg-slate-300 text-black"
                      )}
                      title="Insert Image"
                    >
                      <ImageIcon size={14} />
                    </button>
                    <button 
                      onClick={() => insertSnippet('| Header | Header |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |')}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === 'dark' ? "hover:bg-slate-700 text-white" : "hover:bg-slate-300 text-black"
                      )}
                      title="Insert Table"
                    >
                      <TableIcon size={14} />
                    </button>
                    <div className={cn("w-[1px] h-3 mx-1", theme === 'dark' ? "bg-slate-700" : "bg-black")}></div>
                    <button 
                      onClick={() => insertSnippet('> ')}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === 'dark' ? "hover:bg-slate-700 text-white" : "hover:bg-slate-300 text-black"
                      )}
                      title="Quote"
                    >
                      <Quote size={14} />
                    </button>
                    <button 
                      onClick={() => insertSnippet('- ')}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === 'dark' ? "hover:bg-slate-700 text-white" : "hover:bg-slate-300 text-black"
                      )}
                      title="Bullet List"
                    >
                      <List size={14} />
                    </button>
                    <div className={cn("w-[1px] h-3 mx-1", theme === 'dark' ? "bg-slate-700" : "bg-black")}></div>
                    <button 
                      onClick={handleFoldAll}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === 'dark' ? "hover:bg-slate-700 text-white" : "hover:bg-slate-300 text-black"
                      )}
                      title="Fold All"
                    >
                      <ChevronsDownUp size={14} />
                    </button>
                    <button 
                      onClick={handleUnfoldAll}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === 'dark' ? "hover:bg-slate-700 text-white" : "hover:bg-slate-300 text-black"
                      )}
                      title="Unfold All"
                    >
                      <ChevronsUpDown size={14} />
                    </button>
                  </div>
                </div>
                <span className={cn(
                  "font-mono font-bold",
                  theme === 'dark' ? "text-white" : "text-black"
                )}>Ln {markdown.split('\n').length}</span>
              </div>

              {/* Find and Replace Bar */}
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={cn(
                      "border-b overflow-hidden",
                      theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-black"
                    )}
                  >
                    <div className="p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search size={14} className={cn("absolute left-2.5 top-1/2 -translate-y-1/2", theme === 'dark' ? "text-slate-400" : "text-black")} />
                          <input
                            type="text"
                            placeholder="Find..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                              "w-full pl-9 pr-3 py-1.5 text-xs border rounded focus:ring-1 focus:ring-indigo-500 outline-none transition-all",
                              theme === 'dark' ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-black text-black placeholder:text-black/40"
                            )}
                          />
                        </div>
                        <div className="relative flex-1">
                          <RefreshCw size={14} className={cn("absolute left-2.5 top-1/2 -translate-y-1/2", theme === 'dark' ? "text-slate-400" : "text-black")} />
                          <input
                            type="text"
                            placeholder="Replace with..."
                            value={replaceQuery}
                            onChange={(e) => setReplaceQuery(e.target.value)}
                            className={cn(
                              "w-full pl-9 pr-3 py-1.5 text-xs border rounded focus:ring-1 focus:ring-indigo-500 outline-none transition-all",
                              theme === 'dark' ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-black text-black placeholder:text-black/40"
                            )}
                          />
                        </div>
                        <button
                          onClick={() => setIsSearchOpen(false)}
                          className={theme === 'dark' ? "p-1.5 text-slate-400 hover:text-white rounded" : "p-1.5 text-black hover:text-red-600 rounded"}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex justify-end gap-2">
                         <button
                          onClick={handleReplace}
                          disabled={!searchQuery}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-all disabled:opacity-30",
                            theme === 'dark' ? "text-white border-slate-700 hover:bg-slate-700" : "text-black border-black hover:bg-slate-100"
                          )}
                        >
                          Replace
                        </button>
                        <button
                          onClick={handleReplaceAll}
                          disabled={!searchQuery}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded shadow-sm transition-all disabled:opacity-30",
                            theme === 'dark' ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-800 text-white hover:bg-slate-900"
                          )}
                        >
                          Replace All
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                ref={editorParentRef}
                id="markdown-editor"
                className={cn(
                  "flex-1 w-full h-full overflow-auto",
                  theme === 'dark' ? "selection:bg-indigo-900" : "selection:bg-indigo-100"
                )}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Preview Side */}
        <AnimatePresence mode="wait">
          {(viewMode === 'split' || viewMode === 'preview') && (
            <motion.section 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "h-full flex flex-col overflow-hidden transition-colors duration-300",
                viewMode === 'split' ? "w-1/2" : "w-full",
                theme === 'dark' ? "bg-[#020617]" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "flex items-center justify-between px-4 py-2 border-b text-[11px] font-bold uppercase tracking-wider select-none",
                theme === 'dark' ? "bg-[#090e1a] border-slate-800 text-slate-400" : "bg-slate-300 border-black/30 text-black"
              )}>
                <span className="flex items-center gap-2">
                  <Eye size={12} className={theme === 'dark' ? "text-slate-400" : "text-black"} />
                  Rendered Preview
                </span>
                <span className={cn(
                  "flex items-center gap-2 font-bold",
                  theme === 'dark' ? "text-white" : "text-black"
                )}>
                   <Github size={12} className={theme === 'dark' ? "text-white" : "text-black"} />
                   GFM Active
                </span>
              </div>
              
              <div 
                ref={previewContainerRef}
                className={cn(
                  "flex-1 p-10 overflow-y-auto overflow-x-hidden scroll-smooth",
                  theme === 'dark' ? "selection:bg-indigo-900" : "selection:bg-indigo-100"
                )}
              >
                {markdown ? (
                  <div id="markdown-preview" className={cn(
                    "markdown-body max-w-none transition-all duration-300 p-12 min-h-full mx-auto",
                    theme === 'light' 
                      ? "bg-white shadow-lg border border-slate-200 rounded-sm w-full max-w-4xl" 
                      : "bg-[#090e1a] border border-slate-800 rounded-sm w-full max-w-4xl shadow-2xl"
                  )}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {markdown}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className={cn(
                    "flex flex-col items-center justify-center h-full gap-4",
                    theme === 'dark' ? "text-white" : "text-black"
                  )}>
                    <div className={cn(
                      "p-6 rounded-full",
                      theme === 'dark' ? "bg-slate-800" : "bg-black/10"
                    )}>
                      <FileText size={48} className={theme === 'dark' ? "" : "text-black"} />
                    </div>
                    <p className={cn(
                      "text-sm font-bold uppercase tracking-widest",
                      theme === 'dark' ? "text-slate-400" : "text-black"
                    )}>Awaiting Content</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
        <footer className={cn(
          "h-8 px-4 flex items-center justify-between border-t text-[10px] font-bold uppercase tracking-widest shrink-0 select-none transition-colors duration-300",
          theme === 'dark' ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-black/20 text-black"
        )}>
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5">
              <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-black")}>{wordCount.toLocaleString()}</span> Words
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn("font-bold", theme === 'dark' ? "text-white" : "text-black")}>{charCount.toLocaleString()}</span> Characters
            </span>
          </div>
          <div className="flex gap-6 items-center">
            <span className="flex items-center gap-1.5">
              <span className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              saveStatus === 'saving' ? "bg-amber-400 animate-pulse" : "bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.5)]"
            )}></span>
            <span className={theme === 'dark' ? "text-white" : "text-black"}>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
          </span>
          <span className={cn("hidden sm:inline", theme === 'dark' ? "text-white" : "text-black")}>Markdown GFM v1.0.0</span>
        </div>
        </footer>

        {/* Mobile Nav (Fallback) */}
        <div className={cn(
          "lg:hidden flex items-center justify-center py-2 border-t shrink-0",
          theme === 'dark' ? "bg-slate-800 border-slate-700" : "bg-white border-black"
        )}>
          <div className={cn(
            "flex items-center p-1 rounded-lg",
            theme === 'dark' ? "bg-slate-700" : "bg-slate-200"
          )}>
            <button
              onClick={() => setViewMode('edit')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                viewMode === 'edit' 
                  ? (theme === 'dark' ? "bg-slate-600 text-white shadow-sm" : "bg-white shadow-sm text-black") 
                  : (theme === 'dark' ? "text-white/60" : "text-black/60")
              )}
            >
              Edit
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                viewMode === 'split' 
                  ? (theme === 'dark' ? "bg-slate-600 text-white shadow-sm" : "bg-white shadow-sm text-black") 
                  : (theme === 'dark' ? "text-white/60" : "text-black/60")
              )}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                viewMode === 'preview' 
                  ? (theme === 'dark' ? "bg-slate-600 text-white shadow-sm" : "bg-white shadow-sm text-black") 
                  : (theme === 'dark' ? "text-white/60" : "text-black/60")
              )}
            >
              View
            </button>
          </div>
        </div>
    </div>
  );
}
