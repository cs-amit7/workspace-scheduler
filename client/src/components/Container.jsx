/**
 * Standard content container ensuring consistent max-width and horizontal padding
 * across Navbar and all page layouts.
 *
 * @param {object} props
 * @param {React.ElementType} [props.as='div']
 * @param {string} [props.className='']
 * @param {React.ReactNode} props.children
 */
export default function Container({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`mx-auto max-w-7xl px-4 sm:px-6 ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
