# Fluuix Treasury Box

Tesorería para un comercio de LatAm en **Celo mainnet (42220)** con wFIAT de Ripio. El comercio ve el saldo local, reserva los pagos a proveedores de los próximos días y solo rota el excedente. Default: **dry-run** (no manda transacciones).

Esta entrega para Agents on Open Rails es **solo Celo + Ripio**. Twin (Arbitrum / ARGt / BRAt) queda en el repo, fuera de este perfil. Belo no forma parte del producto.

Companion app: [treasurybox-mobile](https://github.com/hnasar99/treasurybox-mobile) flavor `celo`.

## Qué está implementado

- Lectura de saldos wARS, wBRL, wMXN, wCOP, wPEN, wCLP y USDT en Celo.
- Reserva (`LIQUIDITY_BUFFER_DAYS`) a partir de pagos agendados. `rebalance` aborta si el monto gasta esa reserva.
- Cotización Textile: `/rfq/preview` en dry-run, `/rfq/request` en live. Un par local↔local se rutea vía USDT. Un preview no es un fill.
- Execute live solo con payload Textile. El fallback Uniswap (`minOut = 0`) se cotiza como indicativo y **no se envía**.
- Tag ERC-8021: live exige `CELO_ATTRIBUTION_CODE=celo_202a37e338a2` (tag de Loops). `codeFromRepo("hnasar99/TreasuryBox")` es otro código y no sustituye al de Loops.
- Identidad ERC-8004: script `npm run register:8004`. El JSON committed no está registrado on-chain hasta que se confirme el broadcast.

## Qué no está

- No hay transacción mainnet acreditada hasta que se firme una con el tag de Loops.
- `pay_supplier` en live deja el pago en `queued`; no transfiere ERC-20.
- El cobro del panel es un link/QR. No hay página `/pay` ni liquidación x402.
- El ramp de Ripio es un link a `ramp.ripio.com`. Construir el link no completa el ramp.
- El panel no inventa P&L. No hay fills de Textile ni usuarios independientes registrados.

## Build Ripio (esta entrega)

Node **24+**. El `dist` de rails depende del último `build:*`; hay que construir Ripio antes de demostrar Celo.

```bash
nvm use 24
cp .env.example .env
# set CELO_ATTRIBUTION_CODE=celo_202a37e338a2 before any live send
npm install
npm test
npm run build:ripio
```

`build:ripio` arma solo `RipioRail`, publica `NEXT_PUBLIC_RAIL_PROVIDER=ripio` en el panel y falla si el bundle todavía contiene marcadores Twin (`scripts/verify-tree-shake.mjs`).

| Script | Incluye |
|--------|---------|
| `npm run build:ripio` | Solo RipioRail (Celo / Textile). **Esta entrega.** |
| `npm run build:twin` | Solo TwinRail. Fuera de este evento. |
| `npm run build:full` | Ambos. No usar como artefacto de Open Rails. |

```bash
npm run dev          # eve TUI
npm run dev:panel    # panel en :3000
```

En live, `rebalance` exige el tag de Loops, el piso de liquidez y un quote Textile ejecutable. Gas de approve/swap lo paga la wallet que firma. No hay relayer.

## Tests

```bash
npm test
```

Cubre el sufijo ERC-8021, que `codeFromRepo` no es el tag de Loops, el piso de liquidez y el rechazo de Uniswap/`minOut=0`.

## ERC-8004

```bash
# writes public/agent.json; does not broadcast
npm run register:8004

# broadcast (needs AGENT_PRIVATE_KEY, CELO_ATTRIBUTION_CODE, gas)
TREASURY_MODE=live CONFIRM_REGISTER_8004=yes npm run register:8004
```

`agentURI` por defecto: `https://raw.githubusercontent.com/hnasar99/TreasuryBox/main/public/agent.json`.

## Seguridad

- No commits de `.env` ni claves.
- `TREASURY_MODE=live` más el tag de Loops más un quote ejecutable para enviar.
- Topes por operación, por día y piso de liquidez activos en `rebalance`.
