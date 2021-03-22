import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const updateCart = (newCart: Product[]) => {
    setCart(newCart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  }

  const checkStock = async (productId: number) => {
    const { data } = await api.get<Stock>(`stock/${productId}`);
    if (!data) return 0;
    return data.amount
  }

  const addProduct = async (productId: number) => {
    try {
      const stock = await checkStock(productId)
      if (stock === 0) {

      }
      const index = cart.findIndex(product => product.id === productId);
      let newCart = [...cart];;
      if (index >= 0) {
        if (newCart[index].amount >= stock) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        newCart[index].amount += 1;
      } else {
        const { data } = await api.get(`products/${productId}`)
        newCart = [...cart, { ...data, amount: 1 }];
      }
      updateCart(newCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const index = cart.findIndex(p => p.id === productId);
      if (index < 0) throw new Error();
      const newCart = cart.filter(product => product.id !== productId)
      updateCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;
      const stock = await checkStock(productId);
      console.log(stock);
      if (amount > stock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const newCart = cart
        .map(product => product.id === productId ? { ...product, amount } : product);
      updateCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
