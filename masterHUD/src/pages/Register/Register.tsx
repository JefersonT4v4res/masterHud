import styles from './Register.module.css';

export function Register() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Adicionar lógica de registro aqui
    console.log('Form submitted');
  };