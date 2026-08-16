import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';
const BOT_COUNT = 10;

console.log(`[Bot Simulation] Initializing ${BOT_COUNT} automated WebSocket bots to test Aviator live panel...`);

const bots = [];

for (let i = 1; i <= BOT_COUNT; i++) {
  const botSocket = io(BACKEND_URL, {
    transports: ['websocket'],
    autoConnect: true,
  });

  const botName = `Bot_${i}***${Math.floor(10 + Math.random() * 90)}`;
  let hasPlacedBet = false;

  botSocket.on('connect', () => {
    console.log(`[Bot ${i}] Connected via Socket.IO (${botSocket.id})`);
  });

  // Listen to Round Intermission Countdown -> Place Bet
  botSocket.on('aviator:round_preparing', () => {
    hasPlacedBet = true;
    const betAmount = Math.floor(Math.random() * 50 + 10) * 10; // ₹100 - ₹5000
    console.log(`[Bot ${i} - ${botName}] Placed bet of ₹${betAmount}`);
  });

  // Listen to Flight Multiplier Ticks -> Cashout at random target
  const targetMultiplier = Number((1.15 + Math.random() * 3.5).toFixed(2));
  botSocket.on('aviator:tick', (data) => {
    if (hasPlacedBet && data.multiplier >= targetMultiplier) {
      hasPlacedBet = false;
      console.log(`[Bot ${i} - ${botName}] Cashed out at ${data.multiplier}x (Target: ${targetMultiplier}x)`);
    }
  });

  botSocket.on('aviator:crashed', () => {
    hasPlacedBet = false;
  });

  bots.push(botSocket);
}

console.log(`[Bot Simulation] ${BOT_COUNT} bots actively listening to live game engine!`);
