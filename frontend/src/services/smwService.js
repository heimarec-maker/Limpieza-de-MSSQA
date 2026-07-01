const API_BASE = 'http://localhost:3001/api';

/**
 * Consulta la información técnica de una dirección en SMW.
 * Llama al backend que a su vez llama a los servicios SOAP.
 */
export async function consultarDireccionSmw(direccion, usuario = 'Sistema', esMasivo = false) {
  try {
    const res = await fetch(`${API_BASE}/smw/consultar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direccion, usuario, esMasivo })
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al consultar dirección.');
    
    return json.data; // { direccion, codigoDireccion, cantidadRfs, rfsList }
  } catch (error) {
    console.error('Error en consultarDireccionSmw:', error);
    throw error;
  }
}

/**
 * Ejecuta la limpieza de recursos en SMW.
 */
export async function limpiarDireccionSmw(codigoDireccion, rfsList, usuario, direccion, esMasivo = false) {
  try {
    const res = await fetch(`${API_BASE}/smw/limpiar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigoDireccion, rfsList, usuario, direccion, esMasivo })
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Error al realizar limpieza.');
    
    return json;
  } catch (error) {
    console.error('Error en limpiarDireccionSmw:', error);
    throw error;
  }
}
