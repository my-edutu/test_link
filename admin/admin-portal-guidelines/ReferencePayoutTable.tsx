import React, { useState } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

/**
 * REFERENCE COMPONENT: AdminPayoutTable
 * Use this as a starting point for the Web Portal implementation.
 */

export default function PayoutTable({ payouts, onAction }) {
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [password, setPassword] = useState('');
    const [actionType, setActionType] = useState(''); // 'view' | 'paystack' | 'reject'

    const handleExecute = () => {
        onAction(selectedPayout.id, actionType, password);
        setSelectedPayout(null);
        setPassword('');
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Pending Payout Requests</h2>
                <Button variant="outline">Refresh</Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                            <TableCell>{new Date(payout.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>{payout.accountName}</TableCell>
                            <TableCell className="font-medium text-green-600">${payout.amount}</TableCell>
                            <TableCell>{payout.bankCode}</TableCell>
                            <TableCell className="font-mono text-gray-500">
                                {payout.accountNumber} {/* Should be masked ******1234 */}
                            </TableCell>
                            <TableCell className="space-x-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setSelectedPayout(payout); setActionType('view'); }}
                                >
                                    View Details
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => { setSelectedPayout(payout); setActionType('paystack'); }}
                                >
                                    ⚡ Auto Transfer
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Radiant Security Modal */}
            <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Security Authentication</DialogTitle>
                        <DialogDescription>
                            {actionType === 'paystack'
                                ? `Initiating automated transfer of $${selectedPayout?.amount} to ${selectedPayout?.accountName}.`
                                : "Decrypting sensitive bank account information."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block">Admin Password</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter master password..."
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedPayout(null)}>Cancel</Button>
                        <Button
                            onClick={handleExecute}
                            disabled={!password}
                            className={actionType === 'paystack' ? "bg-blue-600" : ""}
                        >
                            {actionType === 'paystack' ? "Confirm Transfer" : "Decrypt Data"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
