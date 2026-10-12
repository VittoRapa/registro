'use client';

import { useState } from 'react';
import { Calculator, Target, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GradeSimulatorProps {
  initialAverage?: number;
  initialCount?: number;
}

export function GradeSimulator({ initialAverage = 6.0, initialCount = 4 }: GradeSimulatorProps) {
  const [currentAvg, setCurrentAvg] = useState(String(initialAverage));
  const [currentCount, setCurrentCount] = useState(String(initialCount));
  const [targetAvg, setTargetAvg] = useState('7.0');
  const [nextWeight, setNextWeight] = useState('1.0');

  const avgNum = parseFloat(currentAvg) || 0;
  const countNum = parseInt(currentCount, 10) || 1;
  const targetNum = parseFloat(targetAvg) || 0;
  const weightNum = parseFloat(nextWeight) || 1.0;

  // S_curr = avgNum * countNum
  // W_curr = countNum
  // Target formula: g = (target * (W_curr + weight) - S_curr) / weight
  const currentSum = avgNum * countNum;
  const requiredGrade = (targetNum * (countNum + weightNum) - currentSum) / weightNum;

  return (
    <Card className="border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-600" />
            Simulatore Obiettivo Voti
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
            <Target className="mr-1 h-3 w-3" /> Strategia Studio
          </Badge>
        </div>
        <CardDescription>
          Calcola con precisione quale voto devi prendere nella prossima verifica per raggiungere la media desiderata.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Media Attuale
            </label>
            <Input
              type="number"
              step="0.1"
              min="2"
              max="10"
              value={currentAvg}
              onChange={(e) => setCurrentAvg(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Voti già Presi
            </label>
            <Input
              type="number"
              min="1"
              max="30"
              value={currentCount}
              onChange={(e) => setCurrentCount(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Media Obiettivo
            </label>
            <Input
              type="number"
              step="0.1"
              min="4"
              max="10"
              value={targetAvg}
              onChange={(e) => setTargetAvg(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Peso Prossima Verifica
            </label>
            <select
              value={nextWeight}
              onChange={(e) => setNextWeight(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="0.5">Peso 0.5 (Test rapido / Interrogazione breve)</option>
              <option value="1.0">Peso 1.0 (Verifica standard scritta / orale)</option>
              <option value="1.5">Peso 1.5 (Prova complessa / Compito in classe)</option>
              <option value="2.0">Peso 2.0 (Verifica di fine quadrimestre)</option>
            </select>
          </div>
        </div>

        {/* Calculation Result Callout */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          {requiredGrade <= 10 && requiredGrade >= 2 ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Voto richiesto: <span className="text-lg text-emerald-600 font-bold">{requiredGrade.toFixed(2)}</span> (o circa {Math.ceil(requiredGrade * 2) / 2})
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Prendendo almeno <strong className="text-slate-900 dark:text-slate-200">{requiredGrade.toFixed(1)}</strong> nella prossima prova con peso {weightNum}, la tua media salirà esattamente a <strong className="text-emerald-600">{targetNum.toFixed(2)}</strong>.
                </p>
              </div>
            </div>
          ) : requiredGrade > 10 ? (
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Obiettivo non raggiungibile con una singola verifica ({requiredGrade.toFixed(1)} &gt; 10)
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Con {countNum} voti già a registro e media {avgNum.toFixed(2)}, una sola prova non basta a toccare {targetNum.toFixed(2)}. Serviranno almeno 2 o 3 ottime verifiche consecutive (voto 8 o 9).
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <Sparkles className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Obiettivo già ampiamente raggiunto!
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  La tua media attuale ({avgNum.toFixed(2)}) è già superiore all&apos;obiettivo ({targetNum.toFixed(2)}). Anche con una prova di valore inferiore manterrai la media richiesta.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
