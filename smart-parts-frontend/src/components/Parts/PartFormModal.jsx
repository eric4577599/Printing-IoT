import { useState } from 'react';
import { createPart } from '../../api/partsApi';

const PartFormModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        internalPN: '',
        name: '',
        unit: 'pcs',
        specification: '',
        category: '',
        safeStockLevel: 0,
        suppliers: []
    });

    const [newSupplier, setNewSupplier] = useState({
        supplierName: '',
        manufacturerPN: '',
        price: '',
        isPreferred: false
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSupplierChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewSupplier(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const addSupplier = () => {
        if (!newSupplier.supplierName) return;
        setFormData(prev => ({
            ...prev,
            suppliers: [...prev.suppliers, { ...newSupplier }]
        }));
        setNewSupplier({ supplierName: '', manufacturerPN: '', price: '', isPreferred: false });
    };

    const removeSupplier = (index) => {
        setFormData(prev => ({
            ...prev,
            suppliers: prev.suppliers.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createPart(formData);
            alert('Part created successfully!');
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Failed to create part: ' + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Create New Part</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Internal PN *</label>
                            <input name="internalPN" required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Name *</label>
                            <input name="name" required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" onChange={handleChange} />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Specification</label>
                        <input name="specification" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Category</label>
                            <input name="category" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Unit</label>
                            <input name="unit" value={formData.unit} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" onChange={handleChange} />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Safe Stock</label>
                            <input name="safeStockLevel" type="number" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" onChange={handleChange} />
                        </div>
                    </div>

                    {/* Supplier Section */}
                    <div className="mb-6 p-4 bg-gray-50 rounded">
                        <h3 className="text-sm font-bold mb-2 text-gray-600">Suppliers</h3>
                        <div className="flex gap-2 mb-2 items-end">
                            <div>
                                <label className="text-xs">Supplier Name</label>
                                <input name="supplierName" value={newSupplier.supplierName} onChange={handleSupplierChange} className="border p-1 w-full text-sm" placeholder="e.g. SKF" />
                            </div>
                            <div>
                                <label className="text-xs">Mfg PN</label>
                                <input name="manufacturerPN" value={newSupplier.manufacturerPN} onChange={handleSupplierChange} className="border p-1 w-full text-sm" placeholder="e.g. 6200-2Z" />
                            </div>
                            <div>
                                <label className="text-xs">Price</label>
                                <input name="price" type="number" value={newSupplier.price} onChange={handleSupplierChange} className="border p-1 w-20 text-sm" />
                            </div>
                            <div className="flex items-center pb-2">
                                <input type="checkbox" name="isPreferred" checked={newSupplier.isPreferred} onChange={handleSupplierChange} className="mr-1" />
                                <span className="text-xs">Pref?</span>
                            </div>
                            <button type="button" onClick={addSupplier} className="bg-green-500 text-white px-3 py-1 rounded text-sm mb-1">Add</button>
                        </div>

                        {/* List */}
                        <ul className="text-sm">
                            {formData.suppliers.map((s, idx) => (
                                <li key={idx} className="flex justify-between border-b py-1">
                                    <span>{s.supplierName} ({s.manufacturerPN}) {s.isPreferred && '⭐'}</span>
                                    <button type="button" onClick={() => removeSupplier(idx)} className="text-red-500">Remove</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PartFormModal;
