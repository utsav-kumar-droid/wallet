// src/components/WalletDashboard.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import AssetCard from './AssetCard.jsx';
import { getEthBalance, getSolBalance, getBtcBalance, sendEth } from '../services/blockchain';

function WalletDashboard() {
    const { wallet, logout } = useWallet();
    const [balances, setBalances] = useState({ eth: null, sol: null, btc: null });
    
    // --- CHECKOUT REQUEST STATE CONFIGURATIONS ---
    const [checkoutAmount, setCheckoutAmount] = useState(null);
    const [isPaying, setIsPaying] = useState(false);

    // Read incoming order values when the app launches
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const amount = urlParams.get('amount');
        if (amount) {
            setCheckoutAmount(amount);
        }
    }, []);

    const fetchBalances = useCallback(async () => {
        if (!wallet || !wallet.ethereum || !wallet.bitcoin || !wallet.solana) return;

        try {
            console.log("Refreshing balances...");
            const [eth, sol, btc] = await Promise.all([
                getEthBalance(wallet.ethereum.address),
                getSolBalance(wallet.solana.address),
                getBtcBalance(wallet.bitcoin.address)
            ]);
            setBalances({ eth, sol, btc });
        } catch (error) {
            console.error("Failed to fetch all balances:", error);
        }
    }, [wallet]);

    useEffect(() => {
        fetchBalances();
        const interval = setInterval(fetchBalances, 30000);
        return () => clearInterval(interval);
    }, [fetchBalances]);

    // --- PAYMENT EXECUTOR AND REDIRECT LOGIC ---
    const handleStorePayment = async () => {
        try {
            setIsPaying(true);

            // 1. REPLACE THIS WITH YOUR ACTUAL MERCHANT RECEIVING WALLET PUBLIC ADDRESS
            const merchantCryptoAddress = "0x94870077D3462E69dC57fBE2384a83a8bd57fbeF"; 

            // 2. Fire actual on-chain transaction execution (Using Ethereum as our checkout coin here)
            // If the checkout amount from your cart is in rupees, convert it dynamically to your preferred asset unit structure
            const txHash = await sendEth(wallet.ethereum.privateKey, merchantCryptoAddress, "0.001"); 
            console.log("Payment Confirmed On Chain! Tx Hash: ", txHash);

            // 3. READ THE REDIRECT URL PASSED FROM YOUR CART APPS
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect_url');

            if (redirectUrl) {
                // Bounce user straight back to Stamp App with ?payment=success 
                window.location.href = decodeURIComponent(redirectUrl);
            } else {
                alert("Payment Success! However, no redirect callback parameter was attached.");
                setCheckoutAmount(null);
                fetchBalances();
            }

        } catch (error) {
            console.error("On-chain Payment Failed:", error);
            alert("Transaction error: Insufficient funds or network timeout.");
        } finally {
            setIsPaying(false);
        }
    };

    if (!wallet || !wallet.ethereum || !wallet.bitcoin || !wallet.solana) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600">Wallet Data Error</h2>
                <p className="my-4">There was a problem loading your wallet data. Please try logging out and importing your wallet again.</p>
                <button onClick={logout} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">
                    Logout
                </button>
            </div>
        );
    }

    const coins = [
        { name: 'Ethereum', symbol: 'ETH', ...wallet.ethereum },
        { name: 'Solana', symbol: 'SOL', ...wallet.solana },
        { name: 'Bitcoin', symbol: 'BTC', ...wallet.bitcoin },
    ];

    return (
        <div>
            <header className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Wallet Dashboard</h2>
                <button onClick={logout} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">
                    Logout & Lock
                </button>
            </header>

            {/* 🔥 DYNAMIC DETECTED STORE PAYMENT BANNER CONTAINER */}
            {checkoutAmount && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-2xl mb-8 shadow-xl border border-orange-400 transform transition-all duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <span className="bg-white/20 text-xs uppercase font-extrabold px-3 py-1 rounded-full tracking-wider">
                                Incoming Store Order
                            </span>
                            <h3 className="text-2xl font-black mt-2">Stamp Collector Payment Requested</h3>
                            <p className="text-orange-100 font-medium mt-1"> Total Cart Value Requested: <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-white font-bold">₹ {checkoutAmount}</span></p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button 
                                onClick={handleStorePayment}
                                disabled={isPaying}
                                className="flex-1 md:flex-initial bg-white text-orange-600 hover:bg-orange-50 font-black px-6 py-3 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-400 transition-all text-center"
                            >
                                {isPaying ? "Approving Chain Tx..." : "Pay & Confirm Order"}
                            </button>
                            <button 
                                onClick={() => setCheckoutAmount(null)}
                                disabled={isPaying}
                                className="bg-black/20 hover:bg-black/30 font-semibold px-4 py-3 rounded-xl transition-all"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-8">
                <p className="font-bold">Your Mnemonic Phrase (Keep it secret!)</p>
                <p className="font-mono text-sm break-words">{wallet.mnemonic}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coins.map(coin => (
                    <AssetCard
                        key={coin.symbol}
                        coin={coin}
                        balance={balances[coin.symbol.toLowerCase()]}
                        onTransactionSuccess={fetchBalances}
                    />
                ))}
            </div>
        </div>
    );
}

export default WalletDashboard;