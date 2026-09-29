/**
 * Fee Category Form - Create and Edit Fee Categories
 */

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';

interface FeeCategoryFormData {
  code: string;
  name: string;
  status: 'active' | 'inactive';
}

export function FeeCategoryForm() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isEditMode = id && id !== 'new';

  const [formData, setFormData] = useState<FeeCategoryFormData>({
    code: '',
    name: '',
    status: 'active',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditMode && id) {
      loadCategory();
    }
  }, [id, isEditMode]);

  const loadCategory = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const response = await apiService.getFeeCategories();
      const category = response.data.find((c: any) => c.id === id);
      if (category) {
        setFormData({
          code: category.code || '',
          name: category.name || '',
          status: category.status || 'active',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.code.trim()) {
      setError('Category code is required');
      return;
    }

    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && id) {
        // Only send fields that can be updated
        const updateData: { name?: string; status?: 'active' | 'inactive' } = {};
        if (formData.name !== '') updateData.name = formData.name;
        if (formData.status) updateData.status = formData.status;
        
        await apiService.updateFeeCategory(id, updateData);
        navigate('/fees/categories');
      } else {
        await apiService.createFeeCategory({
          code: formData.code,
          name: formData.name,
        });
        navigate('/fees/categories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
        <div style={{ padding: '32px', textAlign: 'center' }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout schoolName={'SMS'} principalName={"User"} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/fees/categories')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#0f172a' }}>
              {isEditMode ? 'Edit Fee Category' : 'Create Fee Category'}
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {isEditMode ? 'Update category details' : 'Create a new fee category'}
            </p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {error && (
              <div style={{
                padding: '12px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                marginBottom: '24px',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Category Code */}
              <div>
                <label htmlFor="code" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Category Code <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={isSubmitting || !!isEditMode}
                  placeholder="e.g., TUITION, LIBRARY, SPORTS"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Unique code for this category (alphanumeric, - and _ allowed)
                  {isEditMode && ' - Cannot be changed after creation'}
                </p>
              </div>

              {/* Category Name */}
              <div>
                <label htmlFor="name" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                  Category Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="e.g., Tuition Fee, Library Fee"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                  }}
                />
              </div>

              {/* Status */}
              {isEditMode && (
                <div>
                  <label htmlFor="status" style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <Button type="submit" disabled={isSubmitting}>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isSubmitting ? 'Saving...' : isEditMode ? 'Update Category' : 'Create Category'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/fees/categories')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}





