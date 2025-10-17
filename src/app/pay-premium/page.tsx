"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Biller = {
    billerId: string;
    billerName: string;
    isAvailable: boolean;
    coverage: string;
    iconUrl?: string;
};

type InputParameter = {
    name: string;
    paramName: string;
    dataType: "NUMERIC" | "ALPHANUMERIC";
    minLength: number;
    maxLength: number;
    regex?: string;
    mandatory: boolean;
    desc?: string;
};

type BillerDetails = {
    inputParameters: InputParameter[];
    paymentModes: string[];
    fetchRequirement: string;
    supportValidation: string;
    paymentAmountExactness: "EXACT" | "ANY";
};

type EnquiryResponse = {
    enquiryReferenceId: string;
    amount: number;
    customerName?: string;
    policyStatus?: string;
    dueDate?: string;
    billNumber?: string;
    billPeriod?: string;
    billDate?: string;
    billDueDate?: string;
    customerParamsDetails?: { Name?: string; Value?: string }[];
    billDetails?: any[];
    additionalDetails?: any[];
    statuscode?: string;
    status?: string;
    rawStatus?: string;
    // Legacy optional fields kept for UI fallbacks
    CustomerName?: string;
    BillNumber?: string;
    BillPeriod?: string;
    BillDate?: string;
    BillDueDate?: string;
    BillAmount?: string;
}

type BillerMeta = {
    totalPages: number;
    currentPage: number;
    totalRecords: number;
    recordsOnCurrentPage: number;
    recordFrom: number;
    recordTo: number;
};

function extractErrorStatus(data: any): string {
    try {
        return (
            data?.error?.status ||
            data?.status ||
            (typeof data?.error === "string" ? data.error : "") ||
            data?.message ||
            ""
        );
    } catch {
        return "";
    }
}

function isErrPayload(data: any): boolean {
    if (!data) return false;
    const statuscode = data?.statuscode || data?.error?.statuscode;
    const status = data?.status || data?.error?.status;
    return (statuscode && String(statuscode).toUpperCase() === "ERR") || (!!status && /invalid|error|failed/i.test(String(status)));
}

const LAMBDA_BASE = (
    process.env.NEXT_PUBLIC_BBPS_PROXY_URL ||
    "https://4vtfgim3z4.execute-api.ap-south-1.amazonaws.com/dev"
).replace(/\/$/, "");

async function fetchBillers(pageNumber: number, recordsPerPage: number): Promise<{ records: Biller[]; meta: BillerMeta }> {
    const res = await fetch(`${LAMBDA_BASE}/bbps/billers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            pagination: { pageNumber, recordsPerPage },
            filters: { categoryKey: "C09" },
        }),
    });
    const data: any = await res.json();
    if (!res.ok) {
        const msg = extractErrorStatus(data) || "Failed to load insurers";
        throw new Error(msg);
    }
    if (isErrPayload(data)) {
        const msg = extractErrorStatus(data) || "Failed to load insurers";
        throw new Error(msg);
    }
    const list = (data as any)?.data?.records || (data as any)?.records || (data as any)?.data || [];
    const records: Biller[] = (list as unknown[]).map((raw): Biller => {
        const b = raw as { billerId?: string; id?: string; billerName?: string; name?: string; isAvailable?: boolean; billerStatus?: string; coverageCity?: string; coverageState?: string; iconUrl?: string };
        return {
            billerId: b.billerId || b.id || "",
            billerName: b.billerName || b.name || "",
            isAvailable: typeof b.isAvailable === "boolean" ? b.isAvailable : b.billerStatus === "ACTIVE",
            coverage: b.coverageCity && b.coverageCity !== "-" ? b.coverageCity : b.coverageState && b.coverageState !== "-" ? b.coverageState : "PAN India",
            iconUrl: b.iconUrl,
        };
    });
    const metaRaw = (data as any)?.data?.meta || {};
    const meta: BillerMeta = {
        totalPages: Number(metaRaw.totalPages || 1),
        currentPage: Number(metaRaw.currentPage || pageNumber || 1),
        totalRecords: Number(metaRaw.totalRecords || records.length),
        recordsOnCurrentPage: Number(metaRaw.recordsOnCurrentPage || records.length),
        recordFrom: Number(metaRaw.recordFrom || 1),
        recordTo: Number(metaRaw.recordTo || records.length),
    };
    return { records, meta };
}

async function fetchBillerDetailsApi(billerId: string): Promise<BillerDetails> {
    const res = await fetch(`${LAMBDA_BASE}/bbps/biller-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billerId }),
    });
    const data: any = await res.json();
    if (!res.ok) {
        const msg = extractErrorStatus(data) || "Failed to load biller details";
        throw new Error(msg);
    }
    if (isErrPayload(data)) {
        const msg = extractErrorStatus(data) || "Failed to load biller details";
        throw new Error(msg);
    }
    const details = (data as any)?.data || data;
    const paramsSrc = (details as any)?.inputParameters || (details as any)?.parameters || [];
    const inputParameters: InputParameter[] = (paramsSrc as unknown[]).map((raw): InputParameter => {
        const p = raw as { name?: string; desc?: string; minLength?: number | string; maxLength?: number | string; inputType?: string; regex?: string; mandatory?: number | boolean; paramName?: string };
        return {
            name: p.desc || p.name || "",
            paramName: p.name || p.paramName || "",
            dataType: p.inputType === "NUMERIC" ? "NUMERIC" : "ALPHANUMERIC",
            minLength: Number(p.minLength || 0),
            maxLength: Number(p.maxLength || 256),
            regex: p.regex || "",
            mandatory: !!p.mandatory,
            desc: p.desc || "",
        };
    });
    const modes = (details as any)?.paymentModes || [];
    const paymentModes: string[] = (modes as unknown[])
        .map((raw) => {
            const m = raw as { name?: string } | string;
            return typeof m === "string" ? m : m?.name || "";
        })
        .filter((s) => !!s) as string[];
    return {
        inputParameters,
        paymentModes: paymentModes.length ? paymentModes : ["UPI", "Internet_Banking", "Debit_Card", "Credit_Card", "Account_Transfer", "NEFT", "Bharat_QR"],
        fetchRequirement: (details as any)?.fetchRequirement || "SUPPORTED",
        supportValidation: (details as any)?.supportValidation || "SUPPORTED",
        paymentAmountExactness: (details as any)?.paymentAmountExactness || "EXACT",
    } as BillerDetails;
}

async function preEnquiryApi(billerId: string, inputParameters: Record<string, string>): Promise<EnquiryResponse> {
    const externalRef = `SABPE_${Date.now()}`;
    const res = await fetch(`${LAMBDA_BASE}/bbps/pre-enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billerId, inputParameters, externalRef }),
    });
    const data: any = await res.json();
    if (!res.ok) {
        const msg = extractErrorStatus(data) || "Failed to fetch premium details";
        throw new Error(msg);
    }
    if (isErrPayload(data)) {
        const msg = extractErrorStatus(data) || "Failed to fetch premium details";
        throw new Error(msg);
    }
    const e = (data as any)?.data || data;
    const billAmount = e?.BillAmount;
    return {
        enquiryReferenceId: e?.enquiryReferenceId || externalRef,
        amount: typeof billAmount === "string" ? Number(billAmount) : (e?.amount ?? 0),
        customerName: e?.CustomerName || e?.customerName,
        policyStatus: e?.policyStatus,
        dueDate: e?.BillDueDate || e?.dueDate,
        billNumber: e?.BillNumber,
        billPeriod: e?.BillPeriod,
        billDate: e?.BillDate,
        billDueDate: e?.BillDueDate,
        customerParamsDetails: Array.isArray(e?.CustomerParamsDetails) ? e.CustomerParamsDetails : [],
        billDetails: Array.isArray(e?.BillDetails) ? e.BillDetails : [],
        additionalDetails: Array.isArray(e?.AdditionalDetails) ? e.AdditionalDetails : [],
        statuscode: (data as any)?.statuscode,
        rawStatus: (data as any)?.status,
    } as EnquiryResponse;
}

export default function PayPremiumPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [billers, setBillers] = useState<Biller[]>([]);
    const [search, setSearch] = useState("");
    const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
    const [billerDetails, setBillerDetails] = useState<BillerDetails | null>(null);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [enquiryData, setEnquiryData] = useState<EnquiryResponse | null>(null);
    const [selectedPaymentMode, setSelectedPaymentMode] = useState<string | null>(null);
    const [loadingBillers, setLoadingBillers] = useState(false);
    const [pageNumber, setPageNumber] = useState(1);
    const [meta, setMeta] = useState<BillerMeta | null>(null);
    const [loadingEnquiry, setLoadingEnquiry] = useState(false);
    const [alert, setAlert] = useState<{ type: "info" | "error" | "success"; message: string } | null>(null);

    useEffect(() => {
        let abort = false;
        (async () => {
            try {
                setLoadingBillers(true);
                const { records, meta } = await fetchBillers(pageNumber, 9);
                if (!abort) {
                    setBillers(records);
                    setMeta(meta);
                }
            } catch (e: any) {
                if (!abort) setAlert({ type: "error", message: e?.message || "Failed to load billers" });
            } finally {
                if (!abort) setLoadingBillers(false);
            }
        })();
        return () => {
            abort = true;
        };
    }, [pageNumber]);

    const filteredBillers = useMemo(() => {
        const q = search.toLowerCase();
        return billers.filter((b) => b.billerName.toLowerCase().includes(q));
    }, [billers, search]);

    const selectBiller = async (b: Biller) => {
        setSelectedBiller(b);
        setAlert({ type: "info", message: "Loading policy details form..." });
        try {
            const details = await fetchBillerDetailsApi(b.billerId);
            setBillerDetails(details);
            setAlert(null);
            setCurrentStep(2);
        } catch (e: any) {
            setAlert({ type: "error", message: e?.message || "Failed to load biller details" });
        }
    };

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!billerDetails || !selectedBiller) return;

        // basic validation
        for (const p of billerDetails.inputParameters) {
            const value = formData[p.paramName] || "";
            if (p.mandatory && !value) {
                setAlert({ type: "error", message: `Please enter ${p.name}` });
                return;
            }
            if (value && p.regex && !(new RegExp(p.regex).test(value))) {
                setAlert({ type: "error", message: `Invalid ${p.name}` });
                return;
            }
            if (value && value.length < p.minLength) {
                setAlert({ type: "error", message: `${p.name} must be at least ${p.minLength} characters` });
                return;
            }
        }

        setCurrentStep(3);
        setLoadingEnquiry(true);
        try {
            const resp = await preEnquiryApi(selectedBiller.billerId, formData);
            setEnquiryData(resp);
        } catch (e: any) {
            setAlert({ type: "error", message: e?.message || "Failed to fetch premium details" });
            setCurrentStep(2);
        } finally {
            setLoadingEnquiry(false);
        }
    };

    const proceedToPayment = () => {
        if (!selectedPaymentMode) {
            setAlert({ type: "error", message: "Please select a payment mode" });
            return;
        }
        setCurrentStep(4);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 w-full">
            <div className="mb-6">
                <nav className="text-sm text-gray-500 mb-2">
                    <Link href="/" className="hover:text-primary">Home</Link>
                    <span className="px-2">/</span>
                    <span className="text-gray-700">Pay Fees</span>
                </nav>
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Pay Education Fees</h1>
                    <p className="text-gray-600 text-lg">Secure and instant fee payment in just a few steps</p>
                </div>
            </div>

            {alert && (
                <div className={`${alert.type === "error" ? "bg-red-100 border-red-400 text-red-700" : alert.type === "success" ? "bg-green-100 border-green-400 text-green-700" : "bg-blue-100 border-blue-400 text-blue-700"} border px-4 py-3 rounded-lg mb-4`}>
                    {alert.message}
                </div>
            )}

            {/* Progress */}
            <div className="bg-white/90 rounded-xl shadow-md p-6 mb-8 border border-lightBg">
                <div className="flex items-center justify-between">
                    {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="flex items-center flex-1 last:flex-none">
                            <div className={`flex flex-col items-center ${currentStep === step ? "opacity-100" : currentStep > step ? "opacity-100" : "opacity-50"}`}>
                                <div className={`w-12 h-12 rounded-full ${currentStep === step ? "bg-gradient-to-r from-primary to-secondary shadow-md" : currentStep > step ? "bg-secondary" : "bg-slate-300"} text-white flex items-center justify-center font-bold mb-2 text-lg`}>{step}</div>
                                <span className="text-sm font-medium text-gray-700">
                                    {step === 1 ? "Select Insurer" : step === 2 ? "Enter Details" : step === 3 ? "Verify Amount" : "Make Payment"}
                                </span>
                            </div>
                            {step < 4 && <div className={`h-[2px] mx-2 flex-1 ${currentStep > step ? "bg-gradient-to-r from-secondary to-accent" : "bg-slate-300"}`} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1 */}
            {currentStep === 1 && (
                <div className="bg-white/90 rounded-xl shadow-md p-8 border border-lightBg">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Your Institution</h2>
                    <div className="mb-6">
                        <div className="relative">
                            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search for your school/college..." className="w-full px-4 py-3 pl-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/70 shadow-sm" />
                        </div>
                    </div>
                    {loadingBillers ? (
                        <div className="flex justify-center items-center py-12"><div className="spinner border-4 border-gray-200 border-t-accent rounded-full w-10 h-10 animate-spin" /></div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredBillers.map((b) => (
                                    <button key={b.billerId} onClick={() => selectBiller(b)} className={`text-left bg-cardBg border ${b.isAvailable ? "border-lightBg hover:border-secondary hover:shadow-lg hover:-translate-y-0.5" : "border-lightBg opacity-50 cursor-not-allowed"} rounded-xl p-6 transition-all`} disabled={!b.isAvailable}>
                                        <div className="flex items-center mb-4">
                                            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mr-4 shadow-inner overflow-hidden">
                                                {b.iconUrl ? (
                                                    <img src={b.iconUrl} alt={b.billerName} className="w-12 h-12 object-contain" />
                                                ) : (
                                                    <i className="fas fa-shield-alt text-3xl text-primary" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900">{b.billerName}</h3>
                                                <p className="text-sm text-gray-500">{b.coverage}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs ${b.isAvailable ? "text-green-600" : "text-red-600"}`}>
                                                <i className="fas fa-circle text-xs mr-1" />
                                                {b.isAvailable ? "Available" : "Unavailable"}
                                            </span>
                                            <span className="text-secondary hover:text-primary font-medium">Select <i className="fas fa-arrow-right ml-1" /></span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-6 flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                    {meta ? `Showing ${meta.recordFrom}-${meta.recordTo} of ${meta.totalRecords}` : ""}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                                        disabled={!meta || pageNumber <= 1}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPageNumber((p) => (!meta ? p + 1 : Math.min(meta.totalPages, p + 1)))}
                                        disabled={!meta || pageNumber >= (meta?.totalPages || 1)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50 hover:bg-gray-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && billerDetails && selectedBiller && (
                <div className="bg-white/90 rounded-xl shadow-md p-8 border border-lightBg">
                    <div className="flex items-center mb-6">
                        <button onClick={() => setCurrentStep(1)} className="text-secondary hover:text-primary mr-4"><i className="fas fa-arrow-left text-xl" /></button>
                        <h2 className="text-2xl font-bold text-gray-900">Enter Student Details</h2>
                    </div>
                    <div className="bg-lightBg rounded-lg p-4 mb-6 flex items-center">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-4 overflow-hidden shadow-inner">
                            {selectedBiller.iconUrl ? (
                                <img src={selectedBiller.iconUrl} alt={selectedBiller.billerName} className="w-10 h-10 object-contain" />
                            ) : (
                                <i className="fas fa-shield-alt text-2xl text-primary" />
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900">{selectedBiller.billerName}</h4>
                            <p className="text-sm text-gray-600">{selectedBiller.coverage}</p>
                        </div>
                    </div>
                    <form onSubmit={onSubmit} className="space-y-6">
                        {billerDetails.inputParameters.map((param) => (
                            <div key={param.paramName}>
                                <label className="block text-gray-700 font-semibold mb-2">{param.name} {param.mandatory && <span className="text-red-500">*</span>}</label>
                                <input
                                    type={param.dataType === "NUMERIC" ? "tel" : "text"}
                                    value={formData[param.paramName] || ""}
                                    onChange={(e) => setFormData((s) => ({ ...s, [param.paramName]: e.target.value }))}
                                    placeholder={param.desc}
                                    minLength={param.minLength}
                                    maxLength={param.maxLength}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/70 shadow-sm"
                                    required={param.mandatory}
                                />
                                {param.desc && <p className="text-sm text-gray-500 mt-1">{param.desc}</p>}
                            </div>
                        ))}
                        <div className="flex gap-4 pt-4">
                            <button type="button" onClick={() => setCurrentStep(1)} className="px-8 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition duration-300">Back</button>
                            <button type="submit" className="flex-1 bg-gradient-to-r from-secondary to-primary text-white px-8 py-3 rounded-lg font-bold hover:from-primary hover:to-secondary transition duration-300 shadow-md">Fetch Fee Details</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Step 3 */}
            {currentStep === 3 && (
                <div className="bg-white/90 rounded-xl shadow-md p-8 border border-lightBg">
                    <div className="flex items-center mb-6">
                        <button onClick={() => setCurrentStep(2)} className="text-secondary hover:text-primary mr-4">
                            <i className="fas fa-arrow-left text-xl" />
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">Verify Fee Details</h2>
                    </div>

                    {loadingEnquiry ? (
                        <div className="flex flex-col justify-center items-center py-12">
                            <div className="spinner mb-4 border-4 border-gray-200 border-t-accent rounded-full w-10 h-10 animate-spin" />
                            <p className="text-gray-600">Fetching your premium details...</p>
                        </div>
                    ) : enquiryData ? (
                        <div>
                            <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg p-6 mb-6 shadow-md">
                                <h3 className="text-xl font-bold mb-4">Fee Details</h3>
                                <div className="space-y-4">
                                    {/* Customer Name */}
                                    <div className="flex justify-between">
                                        <span>Student Name:</span>
                                        <span className="font-semibold">
                                            {enquiryData.customerName ||
                                                enquiryData.CustomerName ||
                                                (Array.isArray(enquiryData.customerParamsDetails)
                                                    ? (enquiryData.customerParamsDetails.find((item: any) =>
                                                        item.Name?.toLowerCase().includes("customer"))?.Value)
                                                    : "N/A"
                                                ) || "N/A"}
                                        </span>
                                    </div>
                                    {/* Bill Number */}
                                    <div className="flex justify-between">
                                        <span>Reference Number:</span>
                                        <span className="font-semibold">
                                            {enquiryData.billNumber || enquiryData.BillNumber || "N/A"}
                                        </span>
                                    </div>
                                    {/* Bill Amount */}
                                    <div className="flex justify-between">
                                        <span>Amount Payable:</span>
                                        <span className="font-semibold text-primary text-xl">
                                            ₹
                                            {enquiryData.amount !== undefined
                                                ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(enquiryData.amount)
                                                : enquiryData.BillAmount
                                                    ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(enquiryData.BillAmount))
                                                    : "N/A"
                                            }
                                        </span>
                                    </div>
                                    {/* Due Date */}
                                    <div className="flex justify-between">
                                        <span>Due Date:</span>
                                        <span className="font-semibold">
                                            {enquiryData.billDueDate || enquiryData.BillDueDate || "N/A"}
                                        </span>
                                    </div>
                                    {/* Policy/Customer Name for display (in addition to Customer Name field) */}
                                    <div className="flex justify-between">
                                        <span>Name:</span>
                                        <span className="font-semibold">
                                            {enquiryData.customerName ||
                                                enquiryData.CustomerName ||
                                                (Array.isArray(enquiryData.customerParamsDetails)
                                                    ? (enquiryData.customerParamsDetails.find((item: any) =>
                                                        item.Name?.toLowerCase().includes("name"))?.Value)
                                                    : "N/A"
                                                ) || "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-lightBg mb-6">
                                <div className="flex flex-wrap gap-3 text-sm">
                                    <span className={`px-3 py-1 rounded-full ${enquiryData.statuscode === 'TXN' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {enquiryData.status || enquiryData.rawStatus || 'Verified'}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-cardBg border border-lightBg">
                                        Ref: {enquiryData.enquiryReferenceId}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-gray-700 font-semibold mb-3">Select Payment Mode</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {["Cash", "UPI", "Card", "Net Banking"].map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setSelectedPaymentMode(mode)}
                                            className={`border-2 rounded-lg p-4 text-center transition duration-300 ${selectedPaymentMode === mode ? "border-accent bg-lightBg ring-2 ring-accent/40" : "border-gray-300 hover:border-secondary hover:shadow-sm"}`}
                                        >
                                            <i className={`fas ${mode === "Cash"
                                                ? "fa-money-bill-wave"
                                                : mode === "UPI"
                                                    ? "fa-mobile-alt"
                                                    : mode === "Card"
                                                        ? "fa-credit-card"
                                                        : "fa-university"
                                                } text-2xl text-primary mb-2`} />
                                            <p className="text-sm font-medium">{mode}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(2)}
                                    className="px-8 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition duration-300"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={proceedToPayment}
                                    className="flex-1 bg-gradient-to-r from-accent to-secondary text-dark px-8 py-3 rounded-lg font-bold hover:text-white transition duration-300 shadow-md"
                                >
                                    Proceed to Payment
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-600">No data</div>
                    )}
                </div>
            )}

            {/* Step 4 */}
            {currentStep === 4 && (
                <div className="bg-white/90 rounded-xl shadow-md p-8 border border-lightBg">
                    <div className="text-center py-12">
                        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fas fa-check text-4xl text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready for Payment</h2>
                        <p className="text-gray-600 mb-8">Payment gateway integration will be implemented here</p>
                        <div className="bg-lightBg rounded-lg p-6 max-w-md mx-auto text-left border border-lightBg">
                            <h3 className="font-semibold mb-3">Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-600">Provider:</span><span className="font-medium">{selectedBiller?.billerName || "-"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">Amount:</span><span className="font-medium">₹{enquiryData ? new Intl.NumberFormat("en-IN").format(enquiryData.amount) : "-"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">Payment Mode:</span><span className="font-medium">{selectedPaymentMode || "-"}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


