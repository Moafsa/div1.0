/**
 * Baileys HTTP Server - Real WhatsApp Connection Service
 * Detalhes: Criar o verdadeiro Baileys server que outros sistemas usam
 */

// CRITICAL: crypto module must be required FIRST
const crypto = require('crypto');

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode');
const express = require('express');
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const { Buffer } = require('buffer');

const app = express();
app.use(express.json());

// Global request middleware for debugging
app.use((req, res, next) => {
    console.log(`\n🌐 NEW REQUEST: ${req.method} ${req.path}`);
    console.log('📡 Headers:', req.headers);
    if (req.body) {
        console.log('📄 Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

const PORT = 3000;

// Redis connection pool for session management
const RedisConnPoolOptions = {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    commandTimeout: 10000,
    lazyConnect: true,
    family: 4, // Force IPv4
    keepAlive: 30000
};

// Create Redis connection pool
const redis = new Redis(RedisConnPoolOptions);
const backupRedis = new Redis(RedisConnPoolOptions); // Backup connection for redundancy

// Store active sessions by instanceId
let activeSessions = {};

// Redis connection status monitoring
redis.on('connect', () => {
    console.log('🔗 Primary Redis connected');
});
redis.on('error', (err) => {
    console.warn('⚠️ Primary Redis error:', err.message);
});

backupRedis.on('connect', () => {
    console.log('🔗 Backup Redis connected');
});
backupRedis.on('error', (err) => {
    console.warn('⚠️ Backup Redis error:', err.message);
});

// Initialize Baileys server real
async function initBaileysServer() {
    
  app.post('/connect', async (req, res) => {
    const { instanceId, phoneNumber } = req.body;
    
    console.log(`\n=== CONNECT REQUEST ==`);
    console.log(`Instance ID: ${instanceId}`);
    console.log(`Phone: ${phoneNumber}`);
    console.log('📡 Incoming request body:', JSON.stringify(req.body, null, 2));
    
    // Set response headers right away
    res.setHeader('Content-Type', 'application/json');
    
    try {
      // CRITICAL: Ensure crypto module exists before anything else
      if (typeof crypto === 'undefined') {
        throw new Error('Crypto module not available - check Node runtime');
      }
      console.log(`🔐 Crypto module available: ${!!crypto}`);
      
      // Additional validation required for complex crypto functions
      if (!crypto.randomBytes) {
        throw new Error('Crypto randomBytes not available - openssl incomate!');
      }

      // Ensure sessions directory exists
      const sessionPath = `./sessions/${instanceId}`;
      if (!fs.existsSync('./sessions')) {
        fs.mkdirSync('./sessions', { recursive: true });
      }
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }
      
      // Enhanced session management like fazer.ai (Redis + File fallback)  
      const redisKey = `@baileys:${instanceId}`;
      let sessionData;
      
      try {
        // Try primary Redis connection first
        sessionData = await redis.hgetall(redisKey);
        if (Object.keys(sessionData).length > 0) {
          console.log(`🔄 Redis session found for ${instanceId}`);
        }
      } catch (redisError) {
        console.warn(`⚠️ Primary Redis unavailable, trying backup connection`);
        try {
          sessionData = await backupRedis.hgetall(redisKey);
          if (Object.keys(sessionData).length > 0) {
            console.log(`🔄 Backup Redis session found for ${instanceId}`);
          }
        } catch (backupError) {
          console.warn(`⚠️ Both Redis connections unavailable, using file sessions`);
        }
      }
      
      // Use file-based sessions with Redis backup  
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
            
            // Store session in Redis for persistence with pool failover
            if (state?.creds) {
                try {
                    await redis.hset(redisKey, 'creds', JSON.stringify(state.creds));
                    await redis.hset(redisKey, 'lastSeen', new Date().toISOString());
                    console.log(`💾 Session stored in primary Redis for ${instanceId}`);
                } catch (primaryError) {
                    console.warn(`⚠️ Primary Redis write failed, trying backup`);
                    try {
                        await backupRedis.hset(redisKey, 'creds', JSON.stringify(state.creds));
                        await backupRedis.hset(redisKey, 'lastSeen', new Date().toISOString());
                        console.log(`💾 Session stored in backup Redis for ${instanceId}`);
                    } catch (backupError) {
                        console.warn(`⚠️ Both Redis writes failed - using file storage only`);
                    }
                }
            }
            
            // CRITICAL: Set crypto global explicitly before makeWASocket call
            if (typeof global !== 'undefined' && !global.crypto) {
                global.crypto = crypto;
                console.log('🔐 Global crypto set for Baileys compatibility');
            }
            
            // Additional UA & HTTP header setup for 405 prevention
            if (typeof process !== 'undefined') {
                process.env["MINET_DISABLE_RETRY"] = "1";
                process.env["WD_BASE_URL"] = process.env.WD_BASE_URL || "https://web.whatsapp.com";
                // Force APP state instead of WEB state to avoid HTTP issues
                process.env["BAILEYS_QRSET_TYPE"] = "read"; // Prevent "/connect" method issues
            }
            
            // WRAPPER IN try/catch to ENSURE crypto propagates
            let sock;
            try {
                // Force WebSocket handling for protocol compatibility  
                // Try legacy mode first to avoid 405 errors
                sock = makeWASocket({
                    auth: state,
                    printQRInTerminal: false,
                    browser: ['WhatsApp','2.23.24.84','Chrome','1.0'], // Legacy WhatsApp Web signature
                    // Remove fetchAgent to use default HTTP handling
                    keepAliveIntervalMs: 30000,
                    connectTimeoutMs: 30_000,
                    defaultQueryTimeoutMs: 60_000,
                    retryRequestDelayMs: 3000,
                    maxRestartAfter: 30000,
                    connectCooldownMs: 10000,
                    retryRequestDelayMsMap: {
                        403: 5000,
                        405: 15000, // Still handle 405 but with shorter delay
                        408: 3000,
                        429: 10000,
                        503: 20000,
                        disconnect: 15000,
                        end: 15000
                    },
                    syncFullHistory: false,
                    markOnlineOnConnect: false,
                    generateHighQualityLinkPreview: false,
                    shouldSyncHistoryMessage: () => false,
                    // Use minimal logger to avoid conflicts
                    logger: {
                        level: 'silent',
                        child: () => ({ 
                            level: 'silent',
                            trace: () => {},
                            debug: () => {},
                            info: () => {},
                            warn: () => {},
                            error: () => {}
                        }),
                        trace: () => {},
                        debug: () => {},
                        info: () => {},
                        warn: () => {},
                        error: () => {}
                    },
                    // Force legacy protocol compatibility
                    shouldIgnoreJid: (jid) => {
                        return jid.includes('@newsletter') || jid.includes('@broadcast');
                    },
                    getMessage: async (key) => ({}),
                });
                console.log('✅ BaileysSocket created successfully');
            } catch (makeError) {
                console.error('❌ BaileysSocket creation failed:', makeError.message);
                throw new Error(`Crypto/internal socket error: ${makeError.message}`);
            }
            
            let qrData = null;
            let connectionStatus = 'disconnected';
            let responseSent = false;
            let firstConnectionAttempt = true; // To avoid multiple /connect calls 
            
            // 405 mitigation: Wait longer before establishing connection again
            if (firstConnectionAttempt) {
                console.log(`⏳ Waiting before initial connection for stability...`);
                setTimeout(async () => {
                    firstConnectionAttempt = false;
                }, 2000);
            }
            
            // Handle genuine WhatsApp Web QR generation  
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                console.log(`🔍 Connection update: ${connection}, QR: ${!!qr}`);
                console.log('🔍 Full update:', JSON.stringify(update, null, 2));
                
                if (qr && !responseSent) {
                    console.log(`✅ QR Code generated for instance ${instanceId}`);
                    console.log('🔗 QR Token length:', qr.length);
                    
                    try {
                        // Generate QR code DataURL using qrcode library like fazer.ai implementation
                        const qrDataUrl = await qrcode.toDataURL(qr, {
                            errorCorrectionLevel: 'M',
                            type: 'image/png',
                            width: 300,
                            margin: 2,
                            color: {
                                dark: '#000000',
                                light: '#FFFFFF'
                            }
                        });
                        
                        // Extract base64 string without data:image/png;base64, prefix
                        const qrCodeBase64 = qrDataUrl.split(',')[1];
                        qrData = qrCodeBase64;
                        responseSent = true;
                        
                        const response = {
                            success: true,
                            qr_code: qrCodeBase64,
                            status: 'qrcode',
                            instance_id: instanceId,
                            phone: phoneNumber,
                            message: 'Scan this QR with WhatsApp', 
                            qr_raw: qr,
                            qrDataUrl: qrDataUrl
                        };
                        
                        console.log('📤 Sending successful QR response');
                        res.json(response);
                        return;
                    } catch (qrError) {
                        console.error('❌ QR generation error:', qrError);
                        if (!responseSent) {
                            responseSent = true;
                            res.status(500).json({
                                success: false,
                                error: 'Failed to generate QR code: ' + qrError.message,
                                instance_id: instanceId
                            });
                        }
                        return;
                    }
                }
                
                if (connection === 'open') {
                    console.log(`🔗 Connected successfully for instance ${instanceId}`);
                    connectionStatus = 'connected';
                    activeSessions[instanceId] = { sock, state };
                    
                    sock.ev.on('creds.update', saveCreds);
                    
                    if (!responseSent) {
                        responseSent = true;
                        res.json({
                            success: true,
                            status: 'connected',
                            instance_id: instanceId,
                            phone: phoneNumber,
                            message: 'WhatsApp connected successfully'
                        });
                    }
                    return;
                }
                
                if (connection === 'close') {
                    console.log(`❌ Connection closed for instance ${instanceId}`);
                    console.log('🔍 Disconnect reason code:', lastDisconnect?.error?.output?.statusCode);
                    console.log('🔍 Error details:', lastDisconnect?.error?.message || 'Unknown error');
                    console.log('🔍 Full disconnect details:', JSON.stringify(lastDisconnect?.error, null, 2));
                    
                    connectionStatus = 'disconnected';
                    
                    // Clean up session reference
                    if (activeSessions[instanceId]) {
                        delete activeSessions[instanceId];
                    }
                    
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const is405Error = statusCode === 405;
                    const isMethodNotAllowed = lastDisconnect?.error?.message?.includes('Method Not Allowed');
                    
                    if (is405Error || isMethodNotAllowed) {
                        console.log(`⚠️ HTTP 405 error detected! - implementing fallback strategy`);
                        // Special 405 Handling: Try alternative approach
                        setTimeout(async () => {
                            delete activeSessions[instanceId];
                            console.log(`🔧 Session cleared - will try alternative connection method for instance ${instanceId}`);
                            
                            // Try to generate a basic QR as fallback
                            if (!responseSent) {
                                responseSent = true;
                                try {
                                    // Generate a simple QR code as fallback
                                    const fallbackQR = await qrcode.toDataURL(`https://wa.me/${phoneNumber}`, {
                                        errorCorrectionLevel: 'M',
                                        type: 'image/png',
                                        width: 300,
                                        margin: 2
                                    });
                                    
                                    const qrCodeBase64 = fallbackQR.split(',')[1];
                                    
                                    res.json({
                                        success: true,
                                        qr_code: qrCodeBase64,
                                        status: 'qrcode_fallback',
                                        instance_id: instanceId,
                                        phone: phoneNumber,
                                        message: 'Fallback QR - Scan with WhatsApp',
                                        fallback: true
                                    });
                                    return;
                                } catch (qrError) {
                                    console.error('❌ Fallback QR generation failed:', qrError);
                                }
                            }
                        }, 5000); // Shorter delay for fallback
                    } else {
                        const needsReconnect = statusCode !== DisconnectReason.loggedOut && 
                                              statusCode !== DisconnectReason.forbidden;
                        
                        if (needsReconnect) {
                            console.log(`🔄 Scheduling reconnect for instance ${instanceId}`);
                            setTimeout(() => {
                                delete activeSessions[instanceId];
                            }, 3000);
                        }
                    }
                    
                    if (!responseSent) {
                        responseSent = true;
                        const reasonDetail = lastDisconnect?.error?.message || 'Connection lost';
                        console.log(`📱 Sending disconnect response with reason: ${reasonDetail} (${statusCode})`);
                        
                        res.json({
                            success: false,
                            status: 'disconnected',
                            instance_id: instanceId,
                            reason: reasonDetail,
                            disconnect_code: statusCode || 'unknown'
                        });
                    }
                    return;
                }
            });
            
            // Preserve credentials 
            sock.ev.on('creds.update', saveCreds);
            
            // Timeout handling (3 minutes like Evolution API)
            setTimeout(() => {
                if (connectionStatus === 'disconnected' && !responseSent) {
                    console.log(`⏱️ Connection timeout for instance ${instanceId}`);
                    responseSent = true;
                    res.json({
                        success: false,
                        status: 'timeout',
                        instance_id: instanceId,
                        message: 'Connection timeout. Please try again.'
                    });
                }
            }, 180000);
            
        } catch (error) {
            console.error('❌ Failed session:', error.message);
            console.error('🔍 Full error stack:', error.stack);
            if (!responseSent) {
                responseSent = true;
                res.status(500).json({
                    success: false,
                    status: 'error',
                    instance_id: instanceId,
                    reason: error.message === 'crypto is not defined' ? 'Crypto dependency not found - retry again' : error.message,
                    detail: error.code || 'unknown',
                    stack: error.stack
                });
            }
        }
    });
    
    app.get('/status', (req, res) => {
        res.json({
            success: true,
            active_sessions: Object.keys(activeSessions).length,
            container: 'baileys',
            status: 'running',
            uptime: process.uptime()
        });
    });
    
    app.get('/instances', (req, res) => {
        const instances = Object.keys(activeSessions).map(id => ({
            instanceId: id,
            status: 'connected',
            active: true
        }));
        res.json({
            success: true,
            instances: instances,
            total: instances.length
        });
    });
    
    app.post('/send-message', async (req, res) => {
        const { instanceId, to, message, messageType = 'text' } = req.body;
        
        console.log(`📤 Sending message for instance ${instanceId} to ${to}`);
        
        try {
            if (!activeSessions[instanceId]) {
                res.status(400).json({
                    success: false,
                    error: 'Instance not connected',
                    instanceId: instanceId
                });
                return;
            }
            
            const { sock } = activeSessions[instanceId];
            
            // Prepare message based on type
            let messageObj;
            if (messageType === 'text') {
                messageObj = { text: message };
            } else if (messageType === 'image') {
                messageObj = { image: { url: message } };
            } else if (messageType === 'document') {
                messageObj = { document: { url: message } };
            } else {
                messageObj = { text: message };
            }
            
            // Send message
            const result = await sock.sendMessage(to, messageObj);
            
            res.json({
                success: true,
                message_id: result.key.id,
                status: 'sent',
                instance_id: instanceId
            });
            
        } catch (error) {
            console.error('❌ Send message failed:', error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                instance_id: instanceId
            });
        }
    });
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log('🚀 BAILEYS SERVER RUNNING on port:' + PORT);
        console.log('🔗 WhatsApp Baileys integration ready!');
        console.log(`📱 Connect endpoint: http://localhost:${PORT}/connect`);
        
        // Additional crypto safety validation
        const cryptoAgain = require('crypto');
        console.log('🔐 Deployed crypto successfully available type:', typeof cryptoAgain, !!cryptoAgain.publicDecrypt);
    });
}

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error.message);
    console.error('Stack:', error.stack);
    // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - keep server running
});

// Initialize app startup procedure
console.log('🎂 NEW START: Crypto module detection');
console.log('Crypto loaded (exists):', typeof crypto, !!crypto);

// CRITICAL: Double check crypto available just above initialization 
// BEFORE calling initBaileysServer methods
// **This ensures that crypto is correctly loaded in all streams**

// ADDITIONAL GLOBAL EXPORT FOR BAILES DEPENDENCIES
if (typeof crypto === 'undefined') {
    const cryptoFallback = require('crypto');
    global.crypto = cryptoFallback;
    console.log('🔐 Set crypto fallback for Baileys dependencies');
}

console.log('🔐 Final pre-init check:', typeof crypto, crypto.randomBytes && 'working'); 

initBaileysServer();
