import React, { useState } from 'react';
import { cn } from '../../utils/cn.js';

export interface MathSymbolItem {
  id: string;
  label: string;
  latex: string;
  displayHint?: string;
  category: string;
}

export const MATH_SYMBOL_CATEGORIES: { id: string; nameAr: string }[] = [
  { id: 'fractions_powers', nameAr: 'الكسور والأسس' },
  { id: 'calculus_limits', nameAr: 'التفاضل والتكامل' },
  { id: 'matrices', nameAr: 'المصفوفات' },
  { id: 'vectors_geometry', nameAr: 'المتجهات والهندسة' },
  { id: 'trigonometry', nameAr: 'المثلثات' },
  { id: 'operators', nameAr: 'العمليات والمقارنات' },
  { id: 'brackets', nameAr: 'الأقواس والمقاييس' },
];

export const MATH_SYMBOLS: MathSymbolItem[] = [
  // 1. Fractions & Powers
  { id: 'frac', label: 'كسر اعتيادي', displayHint: 'a/b', latex: '\\frac{a}{b}', category: 'fractions_powers' },
  { id: 'pow2', label: 'تربيع', displayHint: 'x²', latex: 'x^{2}', category: 'fractions_powers' },
  { id: 'pown', label: 'أس عام', displayHint: 'xⁿ', latex: 'x^{n}', category: 'fractions_powers' },
  { id: 'sub', label: 'دليل سفلي', displayHint: 'xₙ', latex: 'x_{n}', category: 'fractions_powers' },
  { id: 'sqrt', label: 'جذر تربيعي', displayHint: '√x', latex: '\\sqrt{x}', category: 'fractions_powers' },
  { id: 'nthroot', label: 'جذر نوني', displayHint: 'ⁿ√x', latex: '\\sqrt[n]{x}', category: 'fractions_powers' },

  // 2. Calculus & Limits
  { id: 'lim', label: 'نهاية عند 0', displayHint: 'lim(x→0)', latex: '\\lim_{x \\to 0} f(x)', category: 'calculus_limits' },
  { id: 'lim_inf', label: 'نهاية للمالانهاية', displayHint: 'lim(x→∞)', latex: '\\lim_{x \\to \\infty} f(x)', category: 'calculus_limits' },
  { id: 'diff1', label: 'مشتقة د/دس', displayHint: 'd/dx', latex: '\\frac{d}{dx}', category: 'calculus_limits' },
  { id: 'dydx', label: 'دص/دس', displayHint: 'dy/dx', latex: '\\frac{dy}{dx}', category: 'calculus_limits' },
  { id: 'd2ydx2', label: 'مشتقة ثانية', displayHint: 'd²y/dx²', latex: '\\frac{d^2 y}{dx^2}', category: 'calculus_limits' },
  { id: 'int', label: 'تكامل غير محدد', displayHint: '∫ dx', latex: '\\int f(x) \\, dx', category: 'calculus_limits' },
  { id: 'int_def', label: 'تكامل محدد', displayHint: '∫ₐᵇ dx', latex: '\\int_{a}^{b} f(x) \\, dx', category: 'calculus_limits' },
  { id: 'sum', label: 'مجموع سيجما', displayHint: '∑', latex: '\\sum_{i=1}^{n} a_i', category: 'calculus_limits' },
  { id: 'infty', label: 'مالانهاية', displayHint: '∞', latex: '\\infty', category: 'calculus_limits' },

  // 3. Matrices & Determinants
  { id: 'mat2', label: 'مصفوفة 2×2', displayHint: '[2×2]', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', category: 'matrices' },
  { id: 'mat3', label: 'مصفوفة 3×3', displayHint: '[3×3]', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', category: 'matrices' },
  { id: 'det2', label: 'محدد 2×2', displayHint: '|2×2|', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', category: 'matrices' },
  { id: 'det3', label: 'محدد 3×3', displayHint: '|3×3|', latex: '\\begin{vmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{vmatrix}', category: 'matrices' },

  // 4. Vectors & Geometry
  { id: 'vec', label: 'متجه', displayHint: 'v⃗', latex: '\\vec{v}', category: 'vectors_geometry' },
  { id: 'vec_ab', label: 'متجه نقطتين', displayHint: 'AB→', latex: '\\overrightarrow{AB}', category: 'vectors_geometry' },
  { id: 'norm', label: 'معيار المتجه', displayHint: '‖v‖', latex: '\\|\\vec{v}\\|', category: 'vectors_geometry' },
  { id: 'dot', label: 'ضرب قياسي', displayHint: 'A·B', latex: '\\vec{A} \\cdot \\vec{B}', category: 'vectors_geometry' },
  { id: 'cross', label: 'ضرب اتجاهي', displayHint: 'A×B', latex: '\\vec{A} \\times \\vec{B}', category: 'vectors_geometry' },
  { id: 'theta', label: 'ثيتا', displayHint: 'θ', latex: '\\theta', category: 'vectors_geometry' },
  { id: 'alpha', label: 'ألفا', displayHint: 'α', latex: '\\alpha', category: 'vectors_geometry' },
  { id: 'beta', label: 'بيتا', displayHint: 'β', latex: '\\beta', category: 'vectors_geometry' },
  { id: 'pi', label: 'باي', displayHint: 'π', latex: '\\pi', category: 'vectors_geometry' },
  { id: 'perp', label: 'تعامد', displayHint: '⊥', latex: '\\perp', category: 'vectors_geometry' },
  { id: 'parallel', label: 'توازي', displayHint: '∥', latex: '\\parallel', category: 'vectors_geometry' },
  { id: 'triangle', label: 'مثلث', displayHint: '△', latex: '\\triangle ABC', category: 'vectors_geometry' },
  { id: 'angle', label: 'زاوية', displayHint: '∠', latex: '\\angle ABC', category: 'vectors_geometry' },

  // 5. Trigonometry
  { id: 'sin', label: 'جا (sin)', displayHint: 'sin', latex: '\\sin(\\theta)', category: 'trigonometry' },
  { id: 'cos', label: 'جتا (cos)', displayHint: 'cos', latex: '\\cos(\\theta)', category: 'trigonometry' },
  { id: 'tan', label: 'ظا (tan)', displayHint: 'tan', latex: '\\tan(\\theta)', category: 'trigonometry' },
  { id: 'sec', label: 'قا (sec)', displayHint: 'sec', latex: '\\sec(\\theta)', category: 'trigonometry' },
  { id: 'csc', label: 'قتا (csc)', displayHint: 'csc', latex: '\\csc(\\theta)', category: 'trigonometry' },
  { id: 'cot', label: 'ظتا (cot)', displayHint: 'cot', latex: '\\cot(\\theta)', category: 'trigonometry' },
  { id: 'arcsin', label: 'جا⁻¹', displayHint: 'sin⁻¹', latex: '\\sin^{-1}(x)', category: 'trigonometry' },
  { id: 'arccos', label: 'جتا⁻¹', displayHint: 'cos⁻¹', latex: '\\cos^{-1}(x)', category: 'trigonometry' },
  { id: 'arctan', label: 'ظا⁻¹', displayHint: 'tan⁻¹', latex: '\\tan^{-1}(x)', category: 'trigonometry' },

  // 6. Operators & Relations
  { id: 'pm', label: 'موجب أو سالب', displayHint: '±', latex: '\\pm', category: 'operators' },
  { id: 'times', label: 'ضرب', displayHint: '×', latex: '\\times', category: 'operators' },
  { id: 'div', label: 'قسمة', displayHint: '÷', latex: '\\div', category: 'operators' },
  { id: 'leq', label: 'أصغر أو يساوي', displayHint: '≤', latex: '\\leq', category: 'operators' },
  { id: 'geq', label: 'أكبر أو يساوي', displayHint: '≥', latex: '\\geq', category: 'operators' },
  { id: 'neq', label: 'لا يساوي', displayHint: '≠', latex: '\\neq', category: 'operators' },
  { id: 'approx', label: 'تقريباً', displayHint: '≈', latex: '\\approx', category: 'operators' },
  { id: 'in', label: 'ينتمي', displayHint: '∈', latex: '\\in', category: 'operators' },
  { id: 'notin', label: 'لا ينتمي', displayHint: '∉', latex: '\\notin', category: 'operators' },
  { id: 'subset', label: 'محتواة', displayHint: '⊂', latex: '\\subset', category: 'operators' },
  { id: 'cup', label: 'اتحاد', displayHint: '∪', latex: '\\cup', category: 'operators' },
  { id: 'cap', label: 'تقاطع', displayHint: '∩', latex: '\\cap', category: 'operators' },

  // 7. Brackets & Absolute Value
  { id: 'abs', label: 'مقياس مطلَق', displayHint: '|x|', latex: '|x|', category: 'brackets' },
  { id: 'parens', label: 'أقواس دائرية', displayHint: '( ... )', latex: '\\left( x \\right)', category: 'brackets' },
  { id: 'square_brackets', label: 'أقواس مربعة', displayHint: '[ ... ]', latex: '\\left[ x \\right]', category: 'brackets' },
  { id: 'curly_brackets', label: 'أقواس مجموعات', displayHint: '{ ... }', latex: '\\left\\{ x \\right\\}', category: 'brackets' },
];

export interface MathSymbolPaletteProps {
  /**
   * Callback fired when an equation snippet or symbol is clicked.
   */
  onInsert: (latexSnippet: string) => void;
  className?: string;
  testId?: string;
}

/**
 * Egyptian Secondary Mathematics Symbol Palette.
 * Organizes essential high-school math symbols into convenient Arabic tabs.
 */
export const MathSymbolPalette: React.FC<MathSymbolPaletteProps> = ({
  onInsert,
  className,
  testId = 'math-symbol-palette',
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('fractions_powers');

  const filteredSymbols = MATH_SYMBOLS.filter((s) => s.category === activeCategory);

  return (
    <div
      className={cn(
        'math-symbol-palette flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-hidden text-right',
        className
      )}
      dir="rtl"
      data-testid={testId}
    >
      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto p-1.5 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 scrollbar-thin">
        {MATH_SYMBOL_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-all',
              activeCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            )}
            data-testid={`palette-tab-${cat.id}`}
          >
            {cat.nameAr}
          </button>
        ))}
      </div>

      {/* Symbols Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 p-2 max-h-48 overflow-y-auto">
        {filteredSymbols.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onInsert(item.latex)}
            title={`${item.label} (${item.latex})`}
            className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50 hover:border-emerald-500/50 dark:hover:bg-emerald-950/30 transition-colors group cursor-pointer"
            data-testid={`symbol-button-${item.id}`}
          >
            <span
              className="text-sm font-math font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 select-none"
              dir="ltr"
              style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
            >
              {item.displayHint ?? item.latex}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-full">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
