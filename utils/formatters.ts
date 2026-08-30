import { CartItem, NeighborhoodFee } from "../types";

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Simple CRC16 calculation for Pix (standard CCITT-FALSE)
const crc16 = (str: string): string => {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

export const generatePixString = (key: string, name: string, city: string, amount?: number, txId: string = '***'): string => {
  // Limpeza da chave para evitar erros (remove () - e espaços, exceto se for email)
  const cleanKey = key.includes('@') ? key.trim() : key.replace(/[^a-zA-Z0-9]/g, '');

  const formatField = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const nameNorm = name.substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const cityNorm = city.substring(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  let payload = 
    formatField('00', '01') + // Payload Format Indicator
    formatField('26', 
      formatField('00', 'BR.GOV.BCB.PIX') + 
      formatField('01', cleanKey)
    ) + // Merchant Account Information
    formatField('52', '0000') + // Merchant Category Code
    formatField('53', '986') + // Transaction Currency (BRL)
    (amount ? formatField('54', amount.toFixed(2)) : '') + // Transaction Amount
    formatField('58', 'BR') + // Country Code
    formatField('59', nameNorm) + // Merchant Name
    formatField('60', cityNorm) + // Merchant City
    formatField('62', 
      formatField('05', txId)
    ); // Additional Data Field

  payload += '6304'; // CRC16 ID
  payload += crc16(payload);

  return payload;
};

export const generateWhatsAppLink = (
  phone: string,
  restaurantName: string,
  items: CartItem[],
  subtotal: number,
  customer: { 
    customerName: string; 
    address: string; 
    number: string; 
    neighborhood: string;
    paymentMethod: string; 
    needCutlery: string;
    changeFor?: string; 
    notes: string;
    deliveryFee: number;
  },
  pixCodeString?: string // Optional Pix Code
) => {
  // Configuração para impressora térmica (aprox 30-32 caracteres de largura segura)
  const line = "--------------------------------";
  const date = new Date().toLocaleString('pt-BR');
  
  let message = `*${restaurantName.toUpperCase()}*\n`;
  message += `*NOVO PEDIDO ONLINE*\n`;
  message += `${date}\n`;
  message += `${line}\n\n`;
  
  message += `*ITENS DO PEDIDO*\n`;
  
  items.forEach(item => {
    let itemTotal = item.price;
    const optionsText: string[] = [];
    
    // Calculate options total and text
    Object.values(item.selectedOptions).flat().forEach(opt => {
      itemTotal += opt.price;
      // Indentação com espaço especial para alinhar
      optionsText.push(`  + ${opt.name}`);
    });

    // Formato: 
    // 1x Nome do Produto
    //    + Adicional
    //    R$ 20,00
    message += `*${item.quantity}x ${item.name}*\n`;
    if (optionsText.length > 0) {
      message += `${optionsText.join('\n')}\n`;
    }
    message += `   Valor: ${formatCurrency(itemTotal * item.quantity)}\n`;
    message += `\n`;
  });
  
  const total = subtotal + customer.deliveryFee;

  message += `${line}\n`;
  message += `*RESUMO*\n`;
  message += `Subtotal: ${formatCurrency(subtotal)}\n`;
  message += `Entrega:  ${customer.deliveryFee === 0 ? 'Grátis' : formatCurrency(customer.deliveryFee)}\n`;
  message += `*TOTAL:   ${formatCurrency(total)}*\n`;
  message += `${line}\n\n`;
  
  message += `*DADOS DA ENTREGA*\n`;
  message += `Cliente: *${customer.customerName}*\n`;
  message += `${customer.address}, ${customer.number}\n`;
  if (customer.neighborhood) message += `Bairro: ${customer.neighborhood}\n`;
  message += `${line}\n\n`;

  message += `*INFO ADICIONAL*\n`;
  message += `Talher: *${customer.needCutlery}*\n`;
  message += `Pagamento: ${customer.paymentMethod}\n`;
  
  if (customer.paymentMethod === 'Dinheiro') {
      if (customer.changeFor) {
          const changeVal = parseFloat(customer.changeFor.replace(/\./g, '').replace(',', '.')) - total;
          message += `Troco p/: ${customer.changeFor}\n`;
          message += `*Levar:   ${formatCurrency(Math.max(0, changeVal))}*\n`;
      } else {
          message += `Troco: Não precisa\n`;
      }
  }

  if (customer.notes) {
    message += `\n${line}\n`;
    message += `*OBSERVAÇÕES:*\n`;
    message += `${customer.notes}\n`;
  }

  // Adiciona o código PIX na mensagem se existir
  if (customer.paymentMethod === 'Pix' && pixCodeString) {
      message += `\n${line}\n`;
      message += `*PAGAMENTO PIX (Copia e Cola)*\n`;
      message += `Copie o código abaixo:\n\n`;
      message += `${pixCodeString}\n`;
  }
  
  message += `\n${line}\n`;
  message += `Aguarde a confirmação!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

// --- NEIGHBORHOOD MATCHING UTILITIES ---

// Common Brazilian neighborhood abbreviations and their expansions
const ABBREVIATIONS: Record<string, string> = {
  'jd': 'jardim',
  'vl': 'vila',
  'pq': 'parque',
  'st': 'santo',
  'sta': 'santa',
  'sto': 'santo',
  'cj': 'conjunto',
  'conj': 'conjunto',
  'res': 'residencial',
  'resid': 'residencial',
  'ch': 'chacara',
  'chac': 'chacara',
  'cond': 'condominio',
  'hab': 'habitacional',
  'nuc': 'nucleo',
  'lot': 'loteamento',
  'pqe': 'parque',
  'av': 'avenida',
  'r': 'rua',
  'tr': 'travessa',
  'al': 'alameda',
  'bq': 'bosque',
};

/**
 * Normalizes a neighborhood name for flexible comparison.
 * - Removes accents (NFD decomposition)
 * - Lowercases
 * - Removes punctuation (dots, hyphens, apostrophes)
 * - Normalizes whitespace
 * - Expands common Brazilian abbreviations
 */
export const normalizeNeighborhood = (name: string): string => {
  if (!name) return '';

  let normalized = name
    // Remove accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Lowercase
    .toLowerCase()
    // Remove punctuation (dots, hyphens, apostrophes, underscores)
    .replace(/[.\-'_]/g, '')
    // Collapse multiple spaces into one and trim
    .replace(/\s+/g, ' ')
    .trim();

  // Expand abbreviations: split into words, replace known abbreviations, rejoin
  const words = normalized.split(' ');
  const expanded = words.map(word => ABBREVIATIONS[word] || word);
  normalized = expanded.join(' ');

  return normalized;
};

/**
 * Finds the best matching neighborhood from the registered list.
 * Uses a multi-layer matching strategy:
 * 1. Exact normalized match
 * 2. Inclusion match (input contains registered name or vice-versa)
 * 
 * Returns the matched NeighborhoodFee or null if no match found.
 */
export const findMatchingNeighborhood = (
  input: string,
  neighborhoods: NeighborhoodFee[]
): NeighborhoodFee | null => {
  if (!input || !neighborhoods || neighborhoods.length === 0) return null;

  const normalizedInput = normalizeNeighborhood(input);
  if (!normalizedInput) return null;

  // Layer 1: Exact normalized match
  const exactMatch = neighborhoods.find(
    n => normalizeNeighborhood(n.name) === normalizedInput
  );
  if (exactMatch) return exactMatch;

  // Layer 2: Inclusion match — input contains neighborhood or vice-versa
  // Only match if the shorter string is at least 4 characters to avoid false positives
  const inclusionMatch = neighborhoods.find(n => {
    const normalizedName = normalizeNeighborhood(n.name);
    const shorter = normalizedInput.length < normalizedName.length ? normalizedInput : normalizedName;
    if (shorter.length < 4) return false;
    return normalizedInput.includes(normalizedName) || normalizedName.includes(normalizedInput);
  });
  if (inclusionMatch) return inclusionMatch;

  return null;
};

/**
 * Filters neighborhoods for autocomplete suggestions.
 * Returns neighborhoods whose normalized name starts with or includes the normalized input.
 */
export const filterNeighborhoods = (
  input: string,
  neighborhoods: NeighborhoodFee[]
): NeighborhoodFee[] => {
  if (!input || !neighborhoods) return neighborhoods || [];

  const normalizedInput = normalizeNeighborhood(input);
  if (!normalizedInput) return neighborhoods;

  return neighborhoods.filter(n => {
    const normalizedName = normalizeNeighborhood(n.name);
    return normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName);
  });
};