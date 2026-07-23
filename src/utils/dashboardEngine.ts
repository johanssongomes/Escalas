import type { Colaborador, CoverageDay, DashboardIndicators } from '../types';

export function calculateIndicators(colaboradores: Colaborador[], coverageDays: CoverageDay[]): DashboardIndicators {
  const totalConferentes = colaboradores.length;
  
  if (totalConferentes === 0 || coverageDays.length === 0) {
    return {
      totalConferentes: 0,
      coberturaMedia: 0,
      menorCobertura: 0,
      maiorCobertura: 0,
      folgasNoMes: 0,
      domingosTrabalhados: 0,
      domingosDeFolga: 0,
      diasCriticos: 0,
      eficienciaEscala: 0,
    };
  }

  // 1. Coverage Stats
  const coverages = coverageDays.map(d => d.coberturaPct);
  const coberturaMedia = Math.round(coverages.reduce((sum, val) => sum + val, 0) / coverages.length);
  const menorCobertura = Math.min(...coverages);
  const maiorCobertura = Math.max(...coverages);

  // 2. Off Days Stats
  let folgasNoMes = 0;
  colaboradores.forEach(colab => {
    colab.escala.forEach(status => {
      if (status === 'OFF') folgasNoMes++;
    });
  });

  // 3. Sunday Stats
  let domingosTrabalhados = 0;
  let domingosDeFolga = 0;
  colaboradores.forEach(colab => {
    colab.escala.forEach((status, idx) => {
      const isSunday = idx % 7 === 6; // 0=Mon, 6=Sun
      if (isSunday) {
        if (status === 'WORK') domingosTrabalhados++;
        else domingosDeFolga++;
      }
    });
  });

  // 4. Critical Days (e.g., coverage < 70%)
  // T1, T2, T3 shouldn't have zero presence on any day either.
  // We can define a critical day as one where coveragePct is < 70% or any shift has 0 workers.
  const criticalDaysCount = coverageDays.filter(d => d.coberturaPct < 70 || d.t1 === 0 || d.t2 === 0 || d.t3 === 0).length;

  // 5. Scheduling Efficiency
  // Efficiency is high if the variance of coverage is low.
  // Maximum theoretical variance is large, but if daily coverage matches target (5/7 = 71.4%) perfectly, efficiency is 100%.
  // We can compute the standard deviation of coveragePct.
  const mean = coberturaMedia;
  const variance = coverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / coverages.length;
  const stdDev = Math.sqrt(variance);
  // Scale efficiency between 50% and 100%. If stdDev is 0, efficiency is 100%.
  const eficienciaEscala = Math.max(50, Math.min(100, Math.round(100 - (stdDev * 1.5))));

  return {
    totalConferentes,
    coberturaMedia,
    menorCobertura,
    maiorCobertura,
    folgasNoMes,
    domingosTrabalhados,
    domingosDeFolga,
    diasCriticos: criticalDaysCount,
    eficienciaEscala,
  };
}
