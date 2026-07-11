// api/services/exchangeRateService.js
// Solo se usa cuando storeConfig.mostrarTasaCambio === true.
// Requiere la tabla `exchange_rates` (ver sql/schema.sql) y la
// SUPABASE_SERVICE_ROLE configurada.
import { supabaseService } from '../index.js';

export async function getLatestRate() {
  if (!supabaseService) return 1;
  try {
    const { data, error } = await supabaseService
      .from('exchange_rates')
      .select('rate')
      .order('rate_date', { ascending: false })
      .limit(1);
    if (error) throw error;
    return data && data.length > 0 ? Number(data[0].rate) : 1;
  } catch (e) {
    console.error('[ExchangeRate] Error obteniendo tasa:', e.message);
    return 1;
  }
}

export async function setRate(rate) {
  if (!supabaseService) throw new Error('SUPABASE_SERVICE_ROLE no configurado');
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabaseService
    .from('exchange_rates')
    .upsert([{ rate_date: today, rate }], { onConflict: 'rate_date' });
  if (error) throw error;
  return data;
}
