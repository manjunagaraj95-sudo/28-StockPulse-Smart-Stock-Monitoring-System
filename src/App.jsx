
import React, { useState, useEffect, useCallback } from 'react';

// Centralized ROLES configuration for strict RBAC
const ROLES = {
    ADMIN: {
        canViewDashboard: true,
        canManageStock: true, // CRUD on stock items, locations
        canViewAuditLogs: true,
        canApproveOrders: true,
        canExportReports: true,
        canViewAllOrders: true,
        canEditUsers: true,
    },
    STORE_MANAGER: {
        canViewDashboard: true,
        canManageStock: true, // CRUD on stock items, locations in their store
        canViewAuditLogs: false,
        canApproveOrders: true, // Limited approval scope
        canExportReports: true,
        canViewAllOrders: false, // Only orders related to their store
        canEditUsers: false,
    },
    PROCUREMENT_TEAM: {
        canViewDashboard: true,
        canManageStock: false,
        canViewAuditLogs: false,
        canApproveOrders: true,
        canExportReports: true,
        canViewAllOrders: true,
        canEditUsers: false,
    },
    WAREHOUSE_STAFF: {
        canViewDashboard: true,
        canManageStock: true, // Update stock levels, move stock
        canViewAuditLogs: false,
        canApproveOrders: false,
        canExportReports: false,
        canViewAllOrders: false,
        canEditUsers: false,
    },
    OPERATIONS_TEAM: {
        canViewDashboard: true,
        canManageStock: true, // View only, maybe minor updates
        canViewAuditLogs: true,
        canApproveOrders: false,
        canExportReports: true,
        canViewAllOrders: false,
        canEditUsers: false,
    },
};

// Standardized status keys and UI labels
const STATUS_MAP = {
    // Stock Item Statuses
    IN_STOCK: { label: 'In Stock', className: 'status-IN_STOCK' },
    LOW_STOCK: { label: 'Low Stock', className: 'status-LOW_STOCK' },
    EXPIRED: { label: 'Expired', className: 'status-EXPIRED' },
    ON_ORDER: { label: 'On Order', className: 'status-ON_ORDER' },
    ARCHIVED: { label: 'Archived', className: 'status-SECONDARY' }, // Assuming a secondary status color

    // Location Statuses
    OPERATIONAL: { label: 'Operational', className: 'status-OPERATIONAL' },
    MAINTENANCE: { label: 'Under Maintenance', className: 'status-MAINTENANCE' },
    FULL: { label: 'Full', className: 'status-FULL' },

    // Order/Restock Statuses
    PENDING_REVIEW: { label: 'Pending Review', className: 'status-PENDING_REVIEW' },
    APPROVED: { label: 'Approved', className: 'status-APPROVED' },
    REJECTED: { label: 'Rejected', className: 'status-REJECTED' },
    ORDERED: { label: 'Ordered', className: 'status-ORDERED' },
    RECEIVED: { label: 'Received', className: 'status-RECEIVED' },

    // Generic
    ACTIVE: { label: 'Active', className: 'status-IN_STOCK' },
    INACTIVE: { label: 'Inactive', className: 'status-EXPIRED' },
};

const dummyUsers = [
    { id: 'usr-1', name: 'Alice Admin', role: 'ADMIN', email: 'alice@stockpulse.com' },
    { id: 'usr-2', name: 'Bob Manager', role: 'STORE_MANAGER', email: 'bob@stockpulse.com' },
    { id: 'usr-3', name: 'Carol Procurement', role: 'PROCUREMENT_TEAM', email: 'carol@stockpulse.com' },
    { id: 'usr-4', name: 'David Warehouse', role: 'WAREHOUSE_STAFF', email: 'david@stockpulse.com' },
];

const dummyLocations = [
    {
        id: 'loc-1', name: 'Central Warehouse A', address: '123 Main St, Anytown', capacity: 10000,
        currentStockCount: 7500, status: 'OPERATIONAL', lastUpdated: '2023-10-26T10:00:00Z',
        imageUrl: 'https://via.placeholder.com/150/007bff/ffffff?text=WH_A',
    },
    {
        id: 'loc-2', name: 'Retail Store B Backroom', address: '456 Oak Ave, Anytown', capacity: 2000,
        currentStockCount: 1900, status: 'LOW_STOCK', lastUpdated: '2023-10-26T11:30:00Z',
        imageUrl: 'https://via.placeholder.com/150/6c757d/ffffff?text=Store_B',
    },
    {
        id: 'loc-3', name: 'Distribution Center C', address: '789 Pine Ln, Othercity', capacity: 15000,
        currentStockCount: 14900, status: 'FULL', lastUpdated: '2023-10-26T09:00:00Z',
        imageUrl: 'https://via.placeholder.com/150/28a745/ffffff?text=DC_C',
    },
    {
        id: 'loc-4', name: 'Temp Storage D', address: '101 Bay Rd, Anytown', capacity: 5000,
        currentStockCount: 200, status: 'MAINTENANCE', lastUpdated: '2023-10-26T14:00:00Z',
        imageUrl: 'https://via.placeholder.com/150/ffc107/ffffff?text=Temp_D',
    },
];

const dummyStockItems = [
    {
        id: 'stk-1', name: 'Organic Coffee Beans (5kg)', sku: 'CFB-001', quantity: 250, locationId: 'loc-1',
        expiryDate: '2024-12-31', status: 'IN_STOCK', lastUpdated: '2023-10-26T15:00:00Z', supplier: 'BeanCo',
        description: 'Premium organic coffee beans from Brazil.',
        imageUrl: 'https://via.placeholder.com/100/007bff/ffffff?text=Coffee',
        relatedDocs: [{ name: 'Supplier Invoice #123', url: '#' }],
        auditLog: [
            { timestamp: '2023-10-20T08:00:00Z', user: 'David Warehouse', action: 'Received 100 units' },
            { timestamp: '2023-10-25T10:00:00Z', user: 'Bob Manager', action: 'Transferred 50 units to loc-2' },
        ]
    },
    {
        id: 'stk-2', name: 'Recycled Printer Paper (Box)', sku: 'PAP-002', quantity: 15, locationId: 'loc-2',
        expiryDate: 'N/A', status: 'LOW_STOCK', lastUpdated: '2023-10-26T16:00:00Z', supplier: 'EcoOffice',
        description: 'A box of 10 reams of A4 recycled paper.',
        imageUrl: 'https://via.placeholder.com/100/6c757d/ffffff?text=Paper',
        relatedDocs: [],
        auditLog: [
            { timestamp: '2023-10-24T11:00:00Z', user: 'Bob Manager', action: 'Ordered 50 units' },
        ]
    },
    {
        id: 'stk-3', name: 'Fresh Milk (1L)', sku: 'MLK-003', quantity: 50, locationId: 'loc-1',
        expiryDate: '2023-11-05', status: 'EXPIRED', lastUpdated: '2023-10-26T17:00:00Z', supplier: 'DairyFarm',
        description: 'Fresh pasteurized whole milk, 1 liter cartons.',
        imageUrl: 'https://via.placeholder.com/100/dc3545/ffffff?text=Milk',
        relatedDocs: [],
        auditLog: [
            { timestamp: '2023-10-26T09:00:00Z', user: 'David Warehouse', action: 'Marked 50 units as EXPIRED' },
        ]
    },
    {
        id: 'stk-4', name: 'Safety Goggles (Industrial)', sku: 'SFT-004', quantity: 100, locationId: 'loc-3',
        expiryDate: 'N/A', status: 'IN_STOCK', lastUpdated: '2023-10-26T18:00:00Z', supplier: 'SafeGear',
        description: 'ANSI Z87.1 certified safety goggles.',
        imageUrl: 'https://via.placeholder.com/100/28a745/ffffff?text=Goggles',
        relatedDocs: [],
        auditLog: [
            { timestamp: '2023-10-21T14:00:00Z', user: 'David Warehouse', action: 'Received 100 units' },
        ]
    },
    {
        id: 'stk-5', name: 'Disposable Gloves (Box of 100)', sku: 'GLV-005', quantity: 200, locationId: 'loc-1',
        expiryDate: '2025-06-30', status: 'IN_STOCK', lastUpdated: '2023-10-26T19:00:00Z', supplier: 'MedSupply',
        description: 'Latex-free nitrile gloves.',
        imageUrl: 'https://via.placeholder.com/100/17a2b8/ffffff?text=Gloves',
        relatedDocs: [],
        auditLog: [
            { timestamp: '2023-10-18T09:00:00Z', user: 'David Warehouse', action: 'Received 300 units' },
            { timestamp: '2023-10-22T13:00:00Z', user: 'David Warehouse', action: 'Dispatched 100 units' },
        ]
    },
    {
        id: 'stk-6', name: 'Cleaning Solution (5L)', sku: 'CLS-006', quantity: 30, locationId: 'loc-1',
        expiryDate: '2024-03-15', status: 'LOW_STOCK', lastUpdated: '2023-10-26T20:00:00Z', supplier: 'CleanCorp',
        description: 'Multi-purpose industrial cleaning concentrate.',
        imageUrl: 'https://via.placeholder.com/100/ffc107/ffffff?text=Cleaner',
        relatedDocs: [],
        auditLog: []
    },
];

let dummyOrders = [
    {
        id: 'ord-1', itemId: 'stk-2', itemName: 'Recycled Printer Paper (Box)', quantity: 50,
        status: 'PENDING_REVIEW', requestedBy: 'Bob Manager', orderDate: '2023-10-25', eta: '2023-11-05',
        workflowHistory: [
            { stage: 'Requested', user: 'Bob Manager', timestamp: '2023-10-25T10:00:00Z' },
        ],
        slaDueDate: '2023-10-27T10:00:00Z',
    },
    {
        id: 'ord-2', itemId: 'stk-6', itemName: 'Cleaning Solution (5L)', quantity: 20,
        status: 'APPROVED', requestedBy: 'Carol Procurement', approvedBy: 'Alice Admin', orderDate: '2023-10-24', eta: '2023-11-01',
        workflowHistory: [
            { stage: 'Requested', user: 'Carol Procurement', timestamp: '2023-10-24T09:00:00Z' },
            { stage: 'Approved', user: 'Alice Admin', timestamp: '2023-10-24T11:00:00Z' },
        ],
        slaDueDate: '2023-10-26T09:00:00Z', // SLA breached
    },
    {
        id: 'ord-3', itemId: 'stk-1', itemName: 'Organic Coffee Beans (5kg)', quantity: 100,
        status: 'ORDERED', requestedBy: 'Bob Manager', approvedBy: 'Alice Admin', orderDate: '2023-10-20', eta: '2023-10-28',
        workflowHistory: [
            { stage: 'Requested', user: 'Bob Manager', timestamp: '2023-10-20T08:00:00Z' },
            { stage: 'Approved', user: 'Alice Admin', timestamp: '2023-10-20T09:00:00Z' },
            { stage: 'Ordered', user: 'Carol Procurement', timestamp: '2023-10-20T10:00:00Z' },
        ],
        slaDueDate: '2023-10-22T08:00:00Z',
    },
    {
        id: 'ord-4', itemId: 'stk-3', itemName: 'Fresh Milk (1L)', quantity: 100,
        status: 'REJECTED', requestedBy: 'David Warehouse', approvedBy: 'Alice Admin', orderDate: '2023-10-26', eta: '2023-11-02',
        workflowHistory: [
            { stage: 'Requested', user: 'David Warehouse', timestamp: '2023-10-26T08:00:00Z' },
            { stage: 'Rejected', user: 'Alice Admin', timestamp: '2023-10-26T09:00:00Z', reason: 'Item already expired in current stock.' },
        ],
        slaDueDate: '2023-10-28T08:00:00Z',
    },
    {
        id: 'ord-5', itemId: 'stk-5', itemName: 'Disposable Gloves (Box of 100)', quantity: 50,
        status: 'RECEIVED', requestedBy: 'Bob Manager', approvedBy: 'Alice Admin', orderDate: '2023-10-15', eta: '2023-10-20',
        workflowHistory: [
            { stage: 'Requested', user: 'Bob Manager', timestamp: '2023-10-15T09:00:00Z' },
            { stage: 'Approved', user: 'Alice Admin', timestamp: '2023-10-15T10:00:00Z' },
            { stage: 'Ordered', user: 'Carol Procurement', timestamp: '2023-10-15T11:00:00Z' },
            { stage: 'Received', user: 'David Warehouse', timestamp: '2023-10-20T10:00:00Z' },
        ],
        slaDueDate: '2023-10-17T09:00:00Z',
    },
];

const App = () => {
    // Centralized routing state
    const [view, setView] = useState({ screen: 'DASHBOARD', params: {}, history: [] });
    const [currentUserRole, setCurrentUserRole] = useState('ADMIN'); // Default user for demo
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [stockItems, setStockItems] = useState(dummyStockItems);
    const [locations, setLocations] = useState(dummyLocations);
    const [orders, setOrders] = useState(dummyOrders);

    // Global Navigation Handler
    const navigate = useCallback((targetScreen, targetParams = {}) => {
        setView(prev => {
            const currentPath = { screen: prev.screen, params: prev.params };
            // Avoid adding redundant history entries if target is current screen with same params
            if (prev.screen === targetScreen && JSON.stringify(prev.params) === JSON.stringify(targetParams)) {
                return prev;
            }
            return {
                screen: targetScreen,
                params: targetParams,
                history: [...prev.history, currentPath]
            };
        });
    }, []);

    // Back Navigation Handler
    const goBack = useCallback(() => {
        setView(prev => {
            if (prev.history.length > 0) {
                const lastView = prev.history[prev.history.length - 1];
                const newHistory = prev.history.slice(0, prev.history.length - 1);
                return {
                    screen: lastView.screen,
                    params: lastView.params,
                    history: newHistory
                };
            }
            // If no history, default to dashboard
            return { screen: 'DASHBOARD', params: {}, history: [] };
        });
    }, []);

    // Helper to get current user's permissions
    const currentUserPermissions = ROLES[currentUserRole];

    // Global Search Logic
    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        if (query.length > 2) {
            const lowerQuery = query.toLowerCase();
            const allSearchableItems = [
                ...stockItems.map(item => ({ type: 'Stock Item', id: item.id, name: item.name, status: item.status })),
                ...locations.map(loc => ({ type: 'Location', id: loc.id, name: loc.name, status: loc.status })),
                ...orders.map(order => ({ type: 'Order', id: order.id, name: order.itemName, status: order.status })),
            ];

            const filteredResults = allSearchableItems.filter(item =>
                item.name.toLowerCase().includes(lowerQuery) ||
                item.id.toLowerCase().includes(lowerQuery) ||
                (item.status && STATUS_MAP[item.status]?.label.toLowerCase().includes(lowerQuery))
            );
            setSearchResults(filteredResults);
        } else {
            setSearchResults([]);
        }
    }, [stockItems, locations, orders]);

    const handleSearchSelect = useCallback((result) => {
        setSearchQuery('');
        setSearchResults([]);
        switch (result.type) {
            case 'Stock Item':
                navigate('STOCK_ITEM_DETAIL', { itemId: result.id });
                break;
            case 'Location':
                navigate('LOCATION_DETAIL', { locationId: result.id });
                break;
            case 'Order':
                navigate('ORDER_DETAIL', { orderId: result.id });
                break;
            default:
                break;
        }
    }, [navigate]);

    // Logout Handler
    const handleLogout = useCallback(() => {
        setCurrentUserRole('STORE_MANAGER'); // Reset to a different role or a login screen
        navigate('DASHBOARD', {}, true); // Navigate to dashboard and clear history
        console.log("User logged out!");
    }, [navigate]);

    // Generic form submission handler placeholder
    const handleSubmit = useCallback((formData, entityType) => {
        console.log(`Submitting ${entityType} form:`, formData);
        // In a real app, this would dispatch to a store or API
        if (entityType === 'stockItem') {
            setStockItems(prev => {
                const existingIndex = prev.findIndex(item => item.id === formData.id);
                if (existingIndex > -1) {
                    return prev.map(item => item.id === formData.id ? { ...item, ...formData, lastUpdated: new Date().toISOString() } : item);
                }
                return [...prev, { ...formData, id: `stk-${Date.now()}`, lastUpdated: new Date().toISOString() }];
            });
        } else if (entityType === 'location') {
            setLocations(prev => {
                const existingIndex = prev.findIndex(loc => loc.id === formData.id);
                if (existingIndex > -1) {
                    return prev.map(loc => loc.id === formData.id ? { ...loc, ...formData, lastUpdated: new Date().toISOString() } : loc);
                }
                return [...prev, { ...formData, id: `loc-${Date.now()}`, lastUpdated: new Date().toISOString() }];
            });
        } else if (entityType === 'order') {
            setOrders(prev => {
                const existingIndex = prev.findIndex(order => order.id === formData.id);
                if (existingIndex > -1) {
                    return prev.map(order => order.id === formData.id ? { ...order, ...formData, workflowHistory: [...(order.workflowHistory || []), { stage: 'Updated', user: dummyUsers.find(u => u.role === currentUserRole)?.name || 'System', timestamp: new Date().toISOString() }] } : order);
                }
                return [...prev, { ...formData, id: `ord-${Date.now()}`, workflowHistory: [{ stage: 'Created', user: dummyUsers.find(u => u.role === currentUserRole)?.name || 'System', timestamp: new Date().toISOString() }] }];
            });
        }
        goBack(); // After submission, go back to previous list/detail
    }, [currentUserRole, goBack]);

    // Helper to format dates
    const formatDate = useCallback((isoString) => {
        if (!isoString || isoString === 'N/A') return 'N/A';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString; // Return original if invalid date string
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }, []);

    // Placeholder for File Upload
    const handleFileUpload = useCallback((file) => {
        console.log('File uploaded:', file?.name);
        // In a real app, handle actual file storage
        if (file) {
            alert(`File "${file.name}" uploaded successfully (placeholder).`);
        }
    }, []);

    // --- Components for different screens ---

    const GlobalHeader = () => (
        <header className="global-header">
            <div className="global-header-left">
                <div className="app-logo" onClick={() => navigate('DASHBOARD')}>StockPulse</div>
                <nav className="flex">
                    {(currentUserPermissions?.canViewDashboard) && (
                        <a href="#" className={`nav-link ${view.screen === 'DASHBOARD' ? 'active' : ''}`} onClick={() => navigate('DASHBOARD')}>Dashboard</a>
                    )}
                    {(currentUserPermissions?.canManageStock || currentUserPermissions?.canViewAllOrders) && (
                        <a href="#" className={`nav-link ${view.screen === 'STOCK_ITEMS' ? 'active' : ''}`} onClick={() => navigate('STOCK_ITEMS')}>Stock Items</a>
                    )}
                    {(currentUserPermissions?.canManageStock) && (
                        <a href="#" className={`nav-link ${view.screen === 'LOCATIONS' ? 'active' : ''}`} onClick={() => navigate('LOCATIONS')}>Locations</a>
                    )}
                    {(currentUserPermissions?.canViewAllOrders || currentUserPermissions?.canApproveOrders) && (
                        <a href="#" className={`nav-link ${view.screen === 'ORDERS' ? 'active' : ''}`} onClick={() => navigate('ORDERS')}>Orders</a>
                    )}
                    {(currentUserPermissions?.canExportReports) && (
                        <a href="#" className={`nav-link ${view.screen === 'REPORTS' ? 'active' : ''}`} onClick={() => navigate('REPORTS')}>Reports</a>
                    )}
                </nav>
            </div>
            <div className="global-header-right">
                <div className="global-search">
                    <input
                        type="text"
                        placeholder="Search items, locations, orders..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    {(searchResults.length > 0 && searchQuery.length > 0) && (
                        <div className="search-suggestions">
                            {searchResults.slice(0, 5).map(result => (
                                <div key={result.id} className="search-suggestion-item" onClick={() => handleSearchSelect(result)}>
                                    <span style={{ marginRight: 'var(--spacing-sm)', fontWeight: 'var(--font-weight-medium)' }}>{result.type}:</span>
                                    {result.name} (<span className={STATUS_MAP[result.status]?.className}>{STATUS_MAP[result.status]?.label}</span>)
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="user-profile" onClick={handleLogout}>
                    <div className="user-avatar">{currentUserRole?.charAt(0)}</div>
                    <span>{currentUserRole.replace('_', ' ')}</span>
                </div>
            </div>
        </header>
    );

    const Breadcrumbs = ({ currentScreenName, currentParams = {} }) => {
        const path = view.history.map((hist, index) => (
            <React.Fragment key={index}>
                <a href="#" onClick={() => setView({ screen: hist.screen, params: hist.params, history: view.history.slice(0, index) })}>
                    {hist.screen.replace('_', ' ')}
                </a>
                <span className="separator">/</span>
            </React.Fragment>
        ));

        let currentName = currentScreenName.replace('_', ' ');
        if (currentScreenName === 'STOCK_ITEM_DETAIL' && currentParams?.itemId) {
            currentName = stockItems.find(item => item.id === currentParams.itemId)?.name || 'Stock Item Detail';
        } else if (currentScreenName === 'LOCATION_DETAIL' && currentParams?.locationId) {
            currentName = locations.find(loc => loc.id === currentParams.locationId)?.name || 'Location Detail';
        } else if (currentScreenName === 'ORDER_DETAIL' && currentParams?.orderId) {
            currentName = orders.find(ord => ord.id === currentParams.orderId)?.itemName || 'Order Detail';
        }

        return (
            <div className="breadcrumbs">
                <a href="#" onClick={() => navigate('DASHBOARD', {})}>Dashboard</a>
                <span className="separator">/</span>
                {path}
                <span>{currentName}</span>
            </div>
        );
    };

    const StockItemCard = ({ item }) => {
        const statusInfo = STATUS_MAP[item.status] || { label: 'Unknown', className: '' };
        const locationName = locations.find(loc => loc.id === item.locationId)?.name || 'N/A';
        const isExpired = item.status === 'EXPIRED';

        const handleCardClick = (e) => {
            // Only navigate if not clicking an action button directly
            if (!e.target.closest('.card-actions')) {
                navigate('STOCK_ITEM_DETAIL', { itemId: item.id });
            }
        };

        return (
            <div className="card" onClick={handleCardClick}>
                <div className="card-title">{item.name}</div>
                <div className="card-content">
                    SKU: {item.sku} | Qty: {item.quantity} | Loc: {locationName}
                    <br />
                    Expires: {item.expiryDate}
                </div>
                <span className={`card-status ${statusInfo.className}`}>{statusInfo.label}</span>
                <div className="card-actions">
                    <button className="primary" onClick={() => navigate('STOCK_ITEM_DETAIL', { itemId: item.id })}>View Details</button>
                    {(currentUserPermissions?.canManageStock) && (
                        <button className="outline" onClick={(e) => { e.stopPropagation(); alert(`Editing Stock Item: ${item.name}`); }}>Edit</button>
                    )}
                    {(isExpired && currentUserPermissions?.canManageStock) && (
                        <button className="danger" onClick={(e) => { e.stopPropagation(); alert(`Discarding Expired Item: ${item.name}`); }} style={{ backgroundColor: 'var(--color-danger)', color: 'var(--color-surface)' }}>Discard</button>
                    )}
                </div>
            </div>
        );
    };

    const LocationCard = ({ location }) => {
        const statusInfo = STATUS_MAP[location.status] || { label: 'Unknown', className: '' };

        const handleCardClick = (e) => {
            if (!e.target.closest('.card-actions')) {
                navigate('LOCATION_DETAIL', { locationId: location.id });
            }
        };

        return (
            <div className="card" onClick={handleCardClick}>
                <div className="card-title">{location.name}</div>
                <div className="card-content">
                    Address: {location.address}
                    <br />
                    Capacity: {location.currentStockCount} / {location.capacity} units
                </div>
                <span className={`card-status ${statusInfo.className}`}>{statusInfo.label}</span>
                <div className="card-actions">
                    <button className="primary" onClick={() => navigate('LOCATION_DETAIL', { locationId: location.id })}>View Details</button>
                    {(currentUserPermissions?.canManageStock) && (
                        <button className="outline" onClick={(e) => { e.stopPropagation(); alert(`Editing Location: ${location.name}`); }}>Edit</button>
                    )}
                </div>
            </div>
        );
    };

    const OrderCard = ({ order }) => {
        const statusInfo = STATUS_MAP[order.status] || { label: 'Unknown', className: '' };
        const isSlaBreached = new Date(order.slaDueDate) < new Date() && order.status !== 'RECEIVED' && order.status !== 'REJECTED';

        const handleCardClick = (e) => {
            if (!e.target.closest('.card-actions')) {
                navigate('ORDER_DETAIL', { orderId: order.id });
            }
        };

        const handleApprove = (e) => {
            e.stopPropagation(); // Prevent card click
            if (window.confirm(`Are you sure you want to APPROVE order ${order.id}?`)) {
                setOrders(prevOrders => prevOrders.map(o =>
                    o.id === order.id
                        ? { ...o, status: 'APPROVED', approvedBy: dummyUsers.find(u => u.role === currentUserRole)?.name || 'System', workflowHistory: [...(o.workflowHistory || []), { stage: 'Approved', user: dummyUsers.find(u => u.role === currentUserRole)?.name || 'System', timestamp: new Date().toISOString() }] }
                        : o
                ));
                alert('Order Approved!');
            }
        };

        const handleReject = (e) => {
            e.stopPropagation(); // Prevent card click
            if (window.confirm(`Are you sure you want to REJECT order ${order.id}?`)) {
                setOrders(prevOrders => prevOrders.map(o =>
                    o.id === order.id
                        ? { ...o, status: 'REJECTED', approvedBy: dummyUsers.find(u => u.role === currentUserRole)?.name || 'System', workflowHistory: [...(o.workflowHistory || []), { stage: 'Rejected', user: dummyUsers.find(u => u.role === currentUserRole)?.name || 'System', timestamp: new Date().toISOString() }] }
                        : o
                ));
                alert('Order Rejected!');
            }
        };

        const handleMarkAsOrdered = (e) => {
            e.stopPropagation();
            if (window.confirm(`Mark order ${order.id} as ORDERED?`)) {
                setOrders(prevOrders => prevOrders.map(o =>
                    o.id === order.id
                        ? { ...o, status: 'ORDERED', workflowHistory: [...(o.workflowHistory || []), { stage: 'Ordered', user: dummyUsers.find(u => u.role === currentUserRole)?.name || 'System', timestamp: new Date().toISOString() }] }
                        : o
                ));
                alert('Order Marked as Ordered!');
            }
        };

        const handleMarkAsReceived = (e) => {
            e.stopPropagation();
            if (window.confirm(`Mark order ${order.id} as RECEIVED? This will update stock levels.`)) {
                // Update stock item quantity
                setStockItems(prevItems => prevItems.map(item =>
                    item.id === order.itemId
                        ? { ...item, quantity: (item.quantity || 0) + order.quantity, status: ((item.quantity || 0) + order.quantity > 0) ? 'IN_STOCK' : item.status, lastUpdated: new Date().toISOString() }
                        : item
                ));
                // Update order status
                setOrders(prevOrders => prevOrders.map(o =>
                    o.id === order.id
                        ? { ...o, status: 'RECEIVED', workflowHistory: [...(o.workflowHistory || []), { stage: 'Received', user: dummyUsers.find(u => u.role === currentUserRole)?.name || 'System', timestamp: new Date().toISOString() }] }
                        : o
                ));
                alert('Order Marked as Received and Stock Updated!');
            }
        };


        return (
            <div className="card" onClick={handleCardClick}>
                <div className="card-title">Order #{order.id} - {order.itemName}</div>
                <div className="card-content">
                    Qty: {order.quantity} | Req by: {order.requestedBy}
                    <br />
                    Order Date: {order.orderDate} | ETA: {order.eta}
                </div>
                <span className={`card-status ${statusInfo.className} ${isSlaBreached ? 'realtime-pulse' : ''}`}>
                    {statusInfo.label} {(isSlaBreached) && '(SLA Breached!)'}
                </span>
                <div className="card-actions">
                    <button className="primary" onClick={() => navigate('ORDER_DETAIL', { orderId: order.id })}>View Details</button>
                    {(order.status === 'PENDING_REVIEW' && currentUserPermissions?.canApproveOrders) && (
                        <React.Fragment>
                            <button className="primary" onClick={handleApprove}>Approve</button>
                            <button className="outline" onClick={handleReject} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Reject</button>
                        </React.Fragment>
                    )}
                    {(order.status === 'APPROVED' && currentUserPermissions?.canApproveOrders && currentUserRole === 'PROCUREMENT_TEAM') && (
                        <button className="primary" onClick={handleMarkAsOrdered}>Mark as Ordered</button>
                    )}
                     {(order.status === 'ORDERED' && (currentUserPermissions?.canManageStock || currentUserRole === 'WAREHOUSE_STAFF' || currentUserRole === 'STORE_MANAGER')) && (
                        <button className="primary" onClick={handleMarkAsReceived}>Mark as Received</button>
                    )}
                </div>
            </div>
        );
    };

    const DashboardScreen = () => (
        <div className="container realtime-pulse">
            <Breadcrumbs currentScreenName="DASHBOARD" />
            <h2 style={{ marginBottom: 'var(--spacing-xl)' }}>Dashboard Overview</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 mb-lg">
                <div className="card">
                    <h3 className="card-title">Total Stock Value</h3>
                    <p className="card-content" style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>$1,234,567</p>
                    <p className="card-content text-success">↑ 1.2% from last month</p>
                </div>
                <div className="card">
                    <h3 className="card-title">Low Stock Items</h3>
                    <p className="card-content" style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-warning)' }}>{stockItems.filter(item => item.status === 'LOW_STOCK').length}</p>
                    <p className="card-content">Items below reorder point</p>
                </div>
                <div className="card">
                    <h3 className="card-title">Expired Stock</h3>
                    <p className="card-content" style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-danger)' }}>{stockItems.filter(item => item.status === 'EXPIRED').length}</p>
                    <p className="card-content">Items past expiry date</p>
                </div>
                <div className="card">
                    <h3 className="card-title">Pending Orders</h3>
                    <p className="card-content" style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-info)' }}>{orders.filter(order => order.status === 'PENDING_REVIEW').length}</p>
                    <p className="card-content">Orders awaiting approval</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 mb-lg">
                <div className="detail-section">
                    <h3 className="detail-section-title">Stock Level by Location</h3>
                    <div className="chart-placeholder">Bar Chart Placeholder</div>
                    <button className="outline" onClick={() => alert('Exporting Stock Level Chart')}>Export Chart</button>
                </div>
                <div className="detail-section">
                    <h3 className="detail-section-title">Stock Movement Trend</h3>
                    <div className="chart-placeholder">Line Chart Placeholder</div>
                    <button className="outline" onClick={() => alert('Exporting Stock Movement Chart')}>Export Chart</button>
                </div>
                <div className="detail-section">
                    <h3 className="detail-section-title">Order Status Distribution</h3>
                    <div className="chart-placeholder">Donut Chart Placeholder</div>
                    <button className="outline" onClick={() => alert('Exporting Order Status Chart')}>Export Chart</button>
                </div>
            </div>

            <div className="detail-section">
                <h3 className="detail-section-title">Recent Activities</h3>
                <ul className="activity-list">
                    {[
                        { id: 'act-1', icon: '📦', text: '50 units of Organic Coffee Beans received at Central Warehouse A', time: '5 mins ago' },
                        { id: 'act-2', icon: '⚠️', text: 'Recycled Printer Paper stock is now LOW at Retail Store B Backroom', time: '1 hour ago' },
                        { id: 'act-3', icon: '📝', text: 'Order #ord-1 (Printer Paper) moved to PENDING_REVIEW', time: '2 hours ago' },
                        { id: 'act-4', icon: '🚫', text: 'Fresh Milk (1L) marked as EXPIRED at Central Warehouse A', time: '3 hours ago' },
                        { id: 'act-5', icon: '✅', text: 'Order #ord-2 (Cleaning Solution) APPROVED by Alice Admin', time: 'Yesterday' },
                    ].map(activity => (
                        <li key={activity.id} className="activity-item realtime-pulse">
                            <span className="activity-icon">{activity.icon}</span>
                            <span className="activity-text">{activity.text}</span>
                            <span className="activity-time">{activity.time}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );

    const StockItemsScreen = () => {
        const [filter, setFilter] = useState('');
        const [sort, setSort] = useState('name');

        const filteredAndSortedItems = stockItems
            .filter(item => item.name.toLowerCase().includes(filter.toLowerCase()) || item.sku.toLowerCase().includes(filter.toLowerCase()))
            .sort((a, b) => {
                if (sort === 'name') return a.name.localeCompare(b.name);
                if (sort === 'quantity') return a.quantity - b.quantity;
                if (sort === 'status') return a.status.localeCompare(b.status);
                return 0;
            });

        return (
            <div className="container">
                <Breadcrumbs currentScreenName="STOCK_ITEMS" />
                <div className="detail-header">
                    <h2>Stock Items</h2>
                    {(currentUserPermissions?.canManageStock) && (
                        <button className="primary" onClick={() => alert('Open form to Add New Stock Item')}>+ Add Stock Item</button>
                    )}
                </div>

                <div className="flex flex-wrap mb-lg">
                    <input
                        type="text"
                        placeholder="Search by name or SKU"
                        className="form-input flex-grow mr-md"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ width: 'auto' }}
                    />
                    <select className="form-select mr-md" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: '200px' }}>
                        <option value="name">Sort by Name</option>
                        <option value="quantity">Sort by Quantity</option>
                        <option value="status">Sort by Status</option>
                    </select>
                    <button className="outline mr-md" onClick={() => alert('Opening Filter Side Panel')}>Filter</button>
                    <button className="outline mr-md" onClick={() => alert('Exporting Stock Items to Excel')}>Export</button>
                    <button className="outline" onClick={() => alert('Saving current view')}>Save View</button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3">
                    {(filteredAndSortedItems.length > 0) ? (
                        filteredAndSortedItems.map(item => (
                            <StockItemCard key={item.id} item={item} />
                        ))
                    ) : (
                        <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
                            <h3 className="card-title">No Stock Items Found</h3>
                            <p className="card-content">Adjust your search or filters, or add a new stock item.</p>
                            {(currentUserPermissions?.canManageStock) && (
                                <button className="primary mt-md" onClick={() => alert('Open form to Add New Stock Item')}>+ Add New Stock Item</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const StockItemDetailScreen = () => {
        const { itemId } = view.params;
        const item = stockItems.find(i => i.id === itemId);
        const [editMode, setEditMode] = useState(false);
        const [formData, setFormData] = useState({});

        useEffect(() => {
            if (item) {
                setFormData(item);
            }
        }, [item]);

        if (!item) {
            return (
                <div className="container detail-screen">
                    <Breadcrumbs currentScreenName="STOCK_ITEM_DETAIL" currentParams={{ itemId }} />
                    <p>Stock Item not found.</p>
                    <button className="secondary mt-md" onClick={goBack}>Go Back</button>
                </div>
            );
        }

        const statusInfo = STATUS_MAP[item.status] || { label: 'Unknown', className: '' };
        const location = locations.find(loc => loc.id === item.locationId);

        const handleChange = (e) => {
            setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        };

        const handleSave = () => {
            handleSubmit(formData, 'stockItem');
            setEditMode(false);
        };

        const handleCancel = () => {
            setFormData(item);
            setEditMode(false);
        };

        return (
            <div className="container detail-screen">
                <Breadcrumbs currentScreenName="STOCK_ITEM_DETAIL" currentParams={{ itemId }} />
                <div className="detail-header">
                    <h2>{item.name} <span className={`detail-value status ${statusInfo.className}`}>{statusInfo.label}</span></h2>
                    <div>
                        {(currentUserPermissions?.canManageStock && !editMode) && (
                            <button className="outline mr-sm" onClick={() => setEditMode(true)}>Edit Item</button>
                        )}
                        <button className="secondary" onClick={goBack}>Back to List</button>
                    </div>
                </div>

                {(editMode) ? (
                    <div className="detail-section">
                        <h3 className="detail-section-title">Edit Stock Item</h3>
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="name">Item Name</label>
                                <input className="form-input" type="text" id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="sku">SKU</label>
                                <input className="form-input" type="text" id="sku" name="sku" value={formData.sku || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="quantity">Quantity</label>
                                <input className="form-input" type="number" id="quantity" name="quantity" value={formData.quantity || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="locationId">Location</label>
                                <select className="form-select" id="locationId" name="locationId" value={formData.locationId || ''} onChange={handleChange} required>
                                    <option value="">Select Location</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="expiryDate">Expiry Date</label>
                                <input className="form-input" type="date" id="expiryDate" name="expiryDate" value={formData.expiryDate || ''} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="description">Description</label>
                                <textarea className="form-textarea" id="description" name="description" value={formData.description || ''} onChange={handleChange} />
                            </div>
                             <div className="form-group">
                                <label className="form-label" htmlFor="itemStatus">Status</label>
                                <select className="form-select" id="itemStatus" name="status" value={formData.status || ''} onChange={handleChange} required>
                                    {Object.keys(STATUS_MAP).filter(s => ['IN_STOCK', 'LOW_STOCK', 'EXPIRED', 'ON_ORDER'].includes(s)).map(s => (
                                        <option key={s} value={s}>{STATUS_MAP[s]?.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="imageUpload">Upload Image</label>
                                <input type="file" id="imageUpload" onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="primary">Save Changes</button>
                                <button type="button" className="secondary" onClick={handleCancel}>Cancel</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <React.Fragment>
                        <div className="detail-section">
                            <h3 className="detail-section-title">Item Details</h3>
                            <div className="detail-info-grid">
                                <div className="detail-info-item">
                                    <span className="detail-label">SKU</span>
                                    <span className="detail-value">{item.sku}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Quantity</span>
                                    <span className="detail-value">{item.quantity}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Location</span>
                                    <span className="detail-value"><a href="#" onClick={(e) => { e.stopPropagation(); navigate('LOCATION_DETAIL', { locationId: item.locationId }); }}>{location?.name || 'N/A'}</a></span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Expiry Date</span>
                                    <span className="detail-value">{item.expiryDate || 'N/A'}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Supplier</span>
                                    <span className="detail-value">{item.supplier || 'N/A'}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Last Updated</span>
                                    <span className="detail-value">{formatDate(item.lastUpdated)}</span>
                                </div>
                            </div>
                            {(item.description) && (
                                <div className="detail-info-item mt-lg">
                                    <span className="detail-label">Description</span>
                                    <span className="detail-value">{item.description}</span>
                                </div>
                            )}
                        </div>

                        {(item.relatedDocs?.length > 0) && (
                            <div className="detail-section">
                                <h3 className="detail-section-title">Related Documents</h3>
                                <ul>
                                    {item.relatedDocs.map((doc, index) => (
                                        <li key={index} style={{ marginBottom: 'var(--spacing-sm)' }}>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary">{doc.name} (Preview)</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(currentUserPermissions?.canViewAuditLogs && item.auditLog?.length > 0) && (
                            <div className="detail-section">
                                <h3 className="detail-section-title">Audit Log</h3>
                                <ul className="activity-list">
                                    {item.auditLog.map((log, index) => (
                                        <li key={index} className="activity-item">
                                            <span className="activity-icon">📋</span>
                                            <span className="activity-text">{log.action} by {log.user}</span>
                                            <span className="activity-time">{formatDate(log.timestamp)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </React.Fragment>
                )}
            </div>
        );
    };

    const LocationsScreen = () => {
        const [filter, setFilter] = useState('');
        const [sort, setSort] = useState('name');

        const filteredAndSortedLocations = locations
            .filter(loc => loc.name.toLowerCase().includes(filter.toLowerCase()) || loc.address.toLowerCase().includes(filter.toLowerCase()))
            .sort((a, b) => {
                if (sort === 'name') return a.name.localeCompare(b.name);
                if (sort === 'capacity') return a.capacity - b.capacity;
                if (sort === 'status') return a.status.localeCompare(b.status);
                return 0;
            });

        return (
            <div className="container">
                <Breadcrumbs currentScreenName="LOCATIONS" />
                <div className="detail-header">
                    <h2>Locations</h2>
                    {(currentUserPermissions?.canManageStock) && (
                        <button className="primary" onClick={() => alert('Open form to Add New Location')}>+ Add Location</button>
                    )}
                </div>

                <div className="flex flex-wrap mb-lg">
                    <input
                        type="text"
                        placeholder="Search by name or address"
                        className="form-input flex-grow mr-md"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ width: 'auto' }}
                    />
                    <select className="form-select mr-md" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: '200px' }}>
                        <option value="name">Sort by Name</option>
                        <option value="capacity">Sort by Capacity</option>
                        <option value="status">Sort by Status</option>
                    </select>
                    <button className="outline mr-md" onClick={() => alert('Opening Filter Side Panel')}>Filter</button>
                    <button className="outline mr-md" onClick={() => alert('Exporting Locations to Excel')}>Export</button>
                    <button className="outline" onClick={() => alert('Saving current view')}>Save View</button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3">
                    {(filteredAndSortedLocations.length > 0) ? (
                        filteredAndSortedLocations.map(location => (
                            <LocationCard key={location.id} location={location} />
                        ))
                    ) : (
                        <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
                            <h3 className="card-title">No Locations Found</h3>
                            <p className="card-content">Adjust your search or filters, or add a new location.</p>
                            {(currentUserPermissions?.canManageStock) && (
                                <button className="primary mt-md" onClick={() => alert('Open form to Add New Location')}>+ Add New Location</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const LocationDetailScreen = () => {
        const { locationId } = view.params;
        const location = locations.find(loc => loc.id === locationId);
        const [editMode, setEditMode] = useState(false);
        const [formData, setFormData] = useState({});

        useEffect(() => {
            if (location) {
                setFormData(location);
            }
        }, [location]);

        if (!location) {
            return (
                <div className="container detail-screen">
                    <Breadcrumbs currentScreenName="LOCATION_DETAIL" currentParams={{ locationId }} />
                    <p>Location not found.</p>
                    <button className="secondary mt-md" onClick={goBack}>Go Back</button>
                </div>
            );
        }

        const statusInfo = STATUS_MAP[location.status] || { label: 'Unknown', className: '' };
        const itemsAtLocation = stockItems.filter(item => item.locationId === location.id);

        const handleChange = (e) => {
            setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        };

        const handleSave = () => {
            handleSubmit(formData, 'location');
            setEditMode(false);
        };

        const handleCancel = () => {
            setFormData(location);
            setEditMode(false);
        };

        return (
            <div className="container detail-screen">
                <Breadcrumbs currentScreenName="LOCATION_DETAIL" currentParams={{ locationId }} />
                <div className="detail-header">
                    <h2>{location.name} <span className={`detail-value status ${statusInfo.className}`}>{statusInfo.label}</span></h2>
                    <div>
                        {(currentUserPermissions?.canManageStock && !editMode) && (
                            <button className="outline mr-sm" onClick={() => setEditMode(true)}>Edit Location</button>
                        )}
                        <button className="secondary" onClick={goBack}>Back to List</button>
                    </div>
                </div>

                {(editMode) ? (
                    <div className="detail-section">
                        <h3 className="detail-section-title">Edit Location</h3>
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="locName">Location Name</label>
                                <input className="form-input" type="text" id="locName" name="name" value={formData.name || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="address">Address</label>
                                <input className="form-input" type="text" id="address" name="address" value={formData.address || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="capacity">Capacity (units)</label>
                                <input className="form-input" type="number" id="capacity" name="capacity" value={formData.capacity || ''} onChange={handleChange} required />
                            </div>
                             <div className="form-group">
                                <label className="form-label" htmlFor="locationStatus">Status</label>
                                <select className="form-select" id="locationStatus" name="status" value={formData.status || ''} onChange={handleChange} required>
                                    {Object.keys(STATUS_MAP).filter(s => ['OPERATIONAL', 'MAINTENANCE', 'FULL'].includes(s)).map(s => (
                                        <option key={s} value={s}>{STATUS_MAP[s]?.label}</option>
                                    ))}
                                </select>
                            </div>
                             <div className="form-group">
                                <label className="form-label" htmlFor="imageUpload">Upload Location Photo</label>
                                <input type="file" id="imageUpload" onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="primary">Save Changes</button>
                                <button type="button" className="secondary" onClick={handleCancel}>Cancel</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <React.Fragment>
                        <div className="detail-section">
                            <h3 className="detail-section-title">Location Information</h3>
                            <div className="detail-info-grid">
                                <div className="detail-info-item">
                                    <span className="detail-label">Address</span>
                                    <span className="detail-value">{location.address}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Capacity</span>
                                    <span className="detail-value">{location.capacity} units</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Current Stock Count</span>
                                    <span className="detail-value">{location.currentStockCount} units</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Last Updated</span>
                                    <span className="detail-value">{formatDate(location.lastUpdated)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3 className="detail-section-title">Stock Items at this Location ({itemsAtLocation.length})</h3>
                            {(itemsAtLocation.length > 0) ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3">
                                    {itemsAtLocation.map(item => (
                                        <StockItemCard key={item.id} item={item} />
                                    ))}
                                </div>
                            ) : (
                                <p className="card-content">No stock items found at this location.</p>
                            )}
                        </div>
                    </React.Fragment>
                )}
            </div>
        );
    };

    const OrdersScreen = () => {
        const [filter, setFilter] = useState('');
        const [sort, setSort] = useState('orderDate');
        const [statusFilter, setStatusFilter] = useState('ALL');

        const filteredAndSortedOrders = orders
            .filter(order =>
                (statusFilter === 'ALL' || order.status === statusFilter) &&
                (order.itemName.toLowerCase().includes(filter.toLowerCase()) || order.id.toLowerCase().includes(filter.toLowerCase()))
            )
            .sort((a, b) => {
                if (sort === 'orderDate') return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
                if (sort === 'status') return a.status.localeCompare(b.status);
                if (sort === 'quantity') return a.quantity - b.quantity;
                return 0;
            });

        return (
            <div className="container">
                <Breadcrumbs currentScreenName="ORDERS" />
                <div className="detail-header">
                    <h2>Restock Orders</h2>
                    {(currentUserPermissions?.canApproveOrders) && (
                        <button className="primary" onClick={() => alert('Open form to Create New Order')}>+ Create New Order</button>
                    )}
                </div>

                <div className="flex flex-wrap mb-lg align-center">
                    <input
                        type="text"
                        placeholder="Search by item name or Order ID"
                        className="form-input flex-grow mr-md"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ width: 'auto' }}
                    />
                    <select className="form-select mr-md" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '200px' }}>
                        <option value="ALL">All Statuses</option>
                        {Object.keys(STATUS_MAP).filter(s => ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED'].includes(s)).map(s => (
                            <option key={s} value={s}>{STATUS_MAP[s]?.label}</option>
                        ))}
                    </select>
                    <select className="form-select mr-md" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: '200px' }}>
                        <option value="orderDate">Sort by Order Date</option>
                        <option value="status">Sort by Status</option>
                        <option value="quantity">Sort by Quantity</option>
                    </select>
                    <button className="outline mr-md" onClick={() => alert('Opening Filter Side Panel')}>Filter</button>
                    <button className="outline mr-md" onClick={() => alert('Exporting Orders to Excel')}>Export</button>
                    <button className="outline" onClick={() => alert('Saving current view')}>Save View</button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3">
                    {(filteredAndSortedOrders.length > 0) ? (
                        filteredAndSortedOrders.map(order => (
                            <OrderCard key={order.id} order={order} />
                        ))
                    ) : (
                        <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center' }}>
                            <h3 className="card-title">No Orders Found</h3>
                            <p className="card-content">Adjust your search or filters, or create a new order.</p>
                            {(currentUserPermissions?.canApproveOrders) && (
                                <button className="primary mt-md" onClick={() => alert('Open form to Create New Order')}>+ Create New Order</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const OrderDetailScreen = () => {
        const { orderId } = view.params;
        const order = orders.find(o => o.id === orderId);
        const [editMode, setEditMode] = useState(false);
        const [formData, setFormData] = useState({});

        useEffect(() => {
            if (order) {
                setFormData(order);
            }
        }, [order]);

        if (!order) {
            return (
                <div className="container detail-screen">
                    <Breadcrumbs currentScreenName="ORDER_DETAIL" currentParams={{ orderId }} />
                    <p>Order not found.</p>
                    <button className="secondary mt-md" onClick={goBack}>Go Back</button>
                </div>
            );
        }

        const statusInfo = STATUS_MAP[order.status] || { label: 'Unknown', className: '' };
        const item = stockItems.find(i => i.id === order.itemId);
        const isSlaBreached = new Date(order.slaDueDate) < new Date() && order.status !== 'RECEIVED' && order.status !== 'REJECTED';

        const handleChange = (e) => {
            setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        };

        const handleSave = () => {
            handleSubmit(formData, 'order');
            setEditMode(false);
        };

        const handleCancel = () => {
            setFormData(order);
            setEditMode(false);
        };

        const handleAdvanceWorkflow = (newStatus) => {
            if (window.confirm(`Are you sure you want to change order status to ${STATUS_MAP[newStatus]?.label}?`)) {
                setOrders(prevOrders => prevOrders.map(o =>
                    o.id === order.id
                        ? { ...o, status: newStatus, approvedBy: (newStatus === 'APPROVED' || newStatus === 'REJECTED') ? dummyUsers.find(u => u.role === currentUserRole)?.name || 'System' : o.approvedBy,
                            workflowHistory: [...(o.workflowHistory || []), { stage: STATUS_MAP[newStatus]?.label, user: dummyUsers.find(u => u.role === currentUserRole)?.name || 'System', timestamp: new Date().toISOString() }] }
                        : o
                ));
            }
        };

        return (
            <div className="container detail-screen">
                <Breadcrumbs currentScreenName="ORDER_DETAIL" currentParams={{ orderId }} />
                <div className="detail-header">
                    <h2>Order #{order.id} - {order.itemName} <span className={`detail-value status ${statusInfo.className} ${isSlaBreached ? 'realtime-pulse' : ''}`}>{statusInfo.label} {(isSlaBreached) && '(SLA Breached!)'}</span></h2>
                    <div>
                         {(currentUserPermissions?.canApproveOrders && order.status === 'PENDING_REVIEW') && (
                            <button className="primary mr-sm" onClick={() => handleAdvanceWorkflow('APPROVED')}>Approve Order</button>
                        )}
                         {(currentUserPermissions?.canApproveOrders && order.status === 'PENDING_REVIEW') && (
                            <button className="danger mr-sm" onClick={() => handleAdvanceWorkflow('REJECTED')}>Reject Order</button>
                        )}
                        {(currentUserPermissions?.canApproveOrders && order.status === 'APPROVED' && currentUserRole === 'PROCUREMENT_TEAM') && (
                            <button className="primary mr-sm" onClick={() => handleAdvanceWorkflow('ORDERED')}>Mark as Ordered</button>
                        )}
                        {(order.status === 'ORDERED' && (currentUserPermissions?.canManageStock || currentUserRole === 'WAREHOUSE_STAFF' || currentUserRole === 'STORE_MANAGER')) && (
                            <button className="primary mr-sm" onClick={() => handleAdvanceWorkflow('RECEIVED')}>Mark as Received</button>
                        )}
                        <button className="secondary" onClick={goBack}>Back to List</button>
                    </div>
                </div>

                {(editMode) ? (
                     <div className="detail-section">
                        <h3 className="detail-section-title">Edit Order</h3>
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="itemName">Item Name</label>
                                <input className="form-input" type="text" id="itemName" name="itemName" value={formData.itemName || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="quantity">Quantity</label>
                                <input className="form-input" type="number" id="quantity" name="quantity" value={formData.quantity || ''} onChange={handleChange} required />
                            </div>
                             <div className="form-group">
                                <label className="form-label" htmlFor="requestedBy">Requested By</label>
                                <input className="form-input" type="text" id="requestedBy" name="requestedBy" value={formData.requestedBy || ''} onChange={handleChange} />
                            </div>
                             <div className="form-group">
                                <label className="form-label" htmlFor="orderDate">Order Date</label>
                                <input className="form-input" type="date" id="orderDate" name="orderDate" value={formData.orderDate || ''} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="eta">Estimated Time of Arrival (ETA)</label>
                                <input className="form-input" type="date" id="eta" name="eta" value={formData.eta || ''} onChange={handleChange} />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="primary">Save Changes</button>
                                <button type="button" className="secondary" onClick={handleCancel}>Cancel</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <React.Fragment>
                        <div className="detail-section">
                            <h3 className="detail-section-title">Order Details</h3>
                            <div className="detail-info-grid">
                                <div className="detail-info-item">
                                    <span className="detail-label">Item</span>
                                    <span className="detail-value">
                                        <a href="#" onClick={(e) => { e.stopPropagation(); navigate('STOCK_ITEM_DETAIL', { itemId: order.itemId }); }}>
                                            {order.itemName} (SKU: {item?.sku || 'N/A'})
                                        </a>
                                    </span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Quantity</span>
                                    <span className="detail-value">{order.quantity}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Requested By</span>
                                    <span className="detail-value">{order.requestedBy}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Order Date</span>
                                    <span className="detail-value">{order.orderDate}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">ETA</span>
                                    <span className="detail-value">{order.eta}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">Approved By</span>
                                    <span className="detail-value">{order.approvedBy || 'N/A'}</span>
                                </div>
                                <div className="detail-info-item">
                                    <span className="detail-label">SLA Due Date</span>
                                    <span className={`detail-value ${isSlaBreached ? 'text-danger' : ''}`}>{formatDate(order.slaDueDate)} {(isSlaBreached) && '(Breached)'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h3 className="detail-section-title">Workflow & Milestone Tracking</h3>
                            <ul className="activity-list">
                                {order.workflowHistory?.map((entry, index) => (
                                    <li key={index} className="activity-item">
                                        <span className="activity-icon">
                                            {(entry.stage === 'Requested') ? '📝' :
                                            (entry.stage === 'Approved') ? '✅' :
                                            (entry.stage === 'Rejected') ? '🚫' :
                                            (entry.stage === 'Ordered') ? '🚚' :
                                            (entry.stage === 'Received') ? '📦' : '•'}
                                        </span>
                                        <span className="activity-text">
                                            Stage: <strong>{entry.stage}</strong> by {entry.user}
                                            {(entry.reason) && ` (Reason: ${entry.reason})`}
                                        </span>
                                        <span className="activity-time">{formatDate(entry.timestamp)}</span>
                                    </li>
                                ))}
                            </ul>
                            {(!order.workflowHistory || order.workflowHistory.length === 0) && <p>No workflow history available.</p>}
                        </div>

                         {(currentUserPermissions?.canViewAuditLogs) && (
                            <div className="detail-section">
                                <h3 className="detail-section-title">Audit Log for Order</h3>
                                <p>Audit log for this order would be displayed here (immutable trail).</p>
                            </div>
                        )}
                    </React.Fragment>
                )}
            </div>
        );
    };

    const ReportsScreen = () => (
        <div className="container">
            <Breadcrumbs currentScreenName="REPORTS" />
            <h2 className="mb-lg">Reports & Analytics</h2>
            <p className="mb-md">This section provides detailed reports and historical data visualizations. Users can apply dashboard-level filters and export charts to PDF/Excel.</p>

            <div className="detail-section mb-lg">
                <h3 className="detail-section-title">Report Filters</h3>
                <div className="flex flex-wrap align-center">
                    <select className="form-select mr-md" style={{ width: '200px' }}>
                        <option>Filter by Location</option>
                    </select>
                    <select className="form-select mr-md" style={{ width: '200px' }}>
                        <option>Filter by Time Range</option>
                    </select>
                    <button className="primary">Apply Filters</button>
                    <button className="outline ml-md" onClick={() => alert('Saving current filter view')}>Save Filter View</button>
                </div>
            </div>

            <div className="grid md:grid-cols-2">
                <div className="detail-section">
                    <h3 className="detail-section-title">Historical Stock Levels (Line Chart)</h3>
                    <div className="chart-placeholder" style={{ height: '300px' }}>Historical Stock Level Line Chart</div>
                    <button className="outline" onClick={() => alert('Exporting to PDF')}>Export to PDF</button>
                    <button className="outline ml-sm" onClick={() => alert('Exporting to Excel')}>Export to Excel</button>
                </div>
                <div className="detail-section">
                    <h3 className="detail-section-title">Stock Turnover Rate (Bar Chart)</h3>
                    <div className="chart-placeholder" style={{ height: '300px' }}>Stock Turnover Rate Bar Chart</div>
                    <button className="outline" onClick={() => alert('Exporting to PDF')}>Export to PDF</button>
                    <button className="outline ml-sm" onClick={() => alert('Exporting to Excel')}>Export to Excel</button>
                </div>
                <div className="detail-section">
                    <h3 className="detail-section-title">Expiry Forecast (Gauge Chart)</h3>
                    <div className="chart-placeholder" style={{ height: '300px' }}>Expiry Forecast Gauge Chart</div>
                    <button className="outline" onClick={() => alert('Exporting to PDF')}>Export to PDF</button>
                    <button className="outline ml-sm" onClick={() => alert('Exporting to Excel')}>Export to Excel</button>
                </div>
                 <div className="detail-section">
                    <h3 className="detail-section-title">Supplier Performance (Donut Chart)</h3>
                    <div className="chart-placeholder" style={{ height: '300px' }}>Supplier Performance Donut Chart</div>
                    <button className="outline" onClick={() => alert('Exporting to PDF')}>Export to PDF</button>
                    <button className="outline ml-sm" onClick={() => alert('Exporting to Excel')}>Export to Excel</button>
                </div>
            </div>
        </div>
    );


    // --- Render Logic ---
    const renderScreen = () => {
        switch (view.screen) {
            case 'DASHBOARD':
                return <DashboardScreen />;
            case 'STOCK_ITEMS':
                return <StockItemsScreen />;
            case 'STOCK_ITEM_DETAIL':
                return <StockItemDetailScreen />;
            case 'LOCATIONS':
                return <LocationsScreen />;
            case 'LOCATION_DETAIL':
                return <LocationDetailScreen />;
            case 'ORDERS':
                return <OrdersScreen />;
            case 'ORDER_DETAIL':
                return <OrderDetailScreen />;
            case 'REPORTS':
                return <ReportsScreen />;
            default:
                return <DashboardScreen />; // Fallback
        }
    };

    return (
        <div className="App">
            <GlobalHeader />
            <main>
                {renderScreen()}
            </main>
        </div>
    );
};

export default App;