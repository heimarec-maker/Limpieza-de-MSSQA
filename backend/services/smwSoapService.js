/**
 * backend/services/smwSoapService.js
 * Servicio para interactuar con los Web Services SOAP de SMW
 */

const ENDPOINTS = {
  GEOREF: process.env.SMW_GEOREF_URL,
  RFS: process.env.SMW_RFS_URL,
  LIBERAR: process.env.SMW_LIBERAR_URL
};

/**
 * Extrae el valor de una etiqueta XML usando Regex
 */
function getTagValue(xml, tag) {
  // Busca la etiqueta ignorando el prefijo (ej: <ns1:CodigoDireccion> o <CodigoDireccion>)
  const regex = new RegExp(`<([^>]*:)?${tag}[^>]*>([^<]*)<\\/([^>]*:)?${tag}[^>]*>`, 'i');
  const match = xml.match(regex);
  return match ? match[2].trim() : null;
}

/**
 * Extrae múltiples ocurrencias de una etiqueta (para los RFS)
 */
function getRepeatedTagValues(xml, tag) {
  const regex = new RegExp(`<([^>]*:)?${tag}[^>]*>([^<]*)<\\/([^>]*:)?${tag}[^>]*>`, 'gi');
  const matches = [...xml.matchAll(regex)];
  return matches.map(m => m[2].trim());
}

/**
 * 1. Georreferenciar Dirección
 * Obtiene el CodigoDireccion a partir de una dirección normalizada
 */
export async function georeferenciarDireccion(direccionNormalizada) {
  const xmlRequest = `
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:gis="http://www.etb.net.co/gis">
   <soap:Header/>
   <soap:Body>
      <gis:WSGeorreferenciarCR-RQ>
         <gis:CodigoIntegracion>11</gis:CodigoIntegracion>
         <gis:DireccionNormalizada>${direccionNormalizada}</gis:DireccionNormalizada>
         <gis:CodigoMunicipio>11001</gis:CodigoMunicipio>
         <gis:CodigoDepartamento>11</gis:CodigoDepartamento>
      </gis:WSGeorreferenciarCR-RQ>
   </soap:Body>
</soap:Envelope>`.trim();

  try {
    const response = await fetch(ENDPOINTS.GEOREF, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/soap+xml;charset=UTF-8;action="urn:georeferenciarCR"' 
      },
      body: xmlRequest
    });

    const xmlText = await response.text();
    console.log('--- RESPUESTA XML DE GEORREFERENCIAR ---');
    console.log(xmlText);
    console.log('----------------------------------------');
    const codigoDireccion = getTagValue(xmlText, 'CodigoDireccion');
    
    if (!codigoDireccion) {
      // Intentar buscar error
      const descError = getTagValue(xmlText, 'DescripcionError') || 'No se encontró código de dirección en la respuesta de SMW.';
      throw new Error(descError);
    }

    return codigoDireccion;
  } catch (error) {
    console.error('Error en georeferenciarDireccion:', error.message);
    throw error;
  }
}

/**
 * 2. Consultar RFS de una Dirección
 * Obtiene el listado de RFS asociados a un CodigoDireccion
 */
export async function consultarRfs(idDireccion) {
  const xmlRequest = `
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:gis="http://www.etb.net.co/gis">
   <soap:Header/>
   <soap:Body>
      <gis:WsRfsDirecciones-RQ>
         <gis:idDireccion>${idDireccion}</gis:idDireccion>
      </gis:WsRfsDirecciones-RQ>
   </soap:Body>
</soap:Envelope>`.trim();

  try {
    const response = await fetch(ENDPOINTS.RFS, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/soap+xml;charset=UTF-8;action="urn:RfsDirecciones"' 
      },
      body: xmlRequest
    });

    const xmlText = await response.text();
    console.log('--- RESPUESTA XML DE CONSULTA RFS ---');
    // console.log(xmlText); // Comentado para evitar logs masivos en prod
    console.log('-------------------------------------');
    
    // Extraer mensaje descriptivo
    const mensaje = getTagValue(xmlText, 'DescripcionResultado') || '';

    // Nueva estrategia: Buscar pares de etiquetas hijas <rfs> y <puerto> que estén seguidas
    // Esto es más robusto ante etiquetas anidadas con el mismo nombre
    const list = [];
    const pairRegex = /<[^>]*:?rfs[^>]*>([^<]+)<\/[^>]*:?rfs*>\s*<[^>]*:?puerto[^>]*>([^<]*)<\/[^>]*:?puerto[^>]*>/gi;
    let match;
    
    while ((match = pairRegex.exec(xmlText)) !== null) {
      const rfsValue = match[1].trim();
      const puertoValue = match[2].trim();
      
      if (rfsValue.includes('RFS_')) {
        list.push({
          rfs: rfsValue,
          puerto: puertoValue || 'N/A'
        });
      }
    }

    // Si por alguna razón la estructura varía, intentamos un fallback simple
    if (list.length === 0) {
      const allRfs = getRepeatedTagValues(xmlText, 'rfs').filter(v => v.includes('RFS_'));
      const allPorts = getRepeatedTagValues(xmlText, 'puerto');
      allRfs.forEach((rfs, i) => {
        list.push({ rfs, puerto: allPorts[i] || 'N/A' });
      });
    }

    return { list, mensaje };
  } catch (error) {
    console.error('Error en consultarRfs:', error.message);
    throw error;
  }
}

/**
 * 3. Liberar Recursos (Limpiar)
 * Realiza la limpieza de los RFS en una dirección
 */
export async function liberarRecursos(idDireccion, rfsList) {
  const fecha = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // Formato AAAAMMDDHHMMSS aproximado
  
  const accesosXml = rfsList.map(item => {
    const rfsVal = typeof item === 'string' ? item : item.rfs;
    return `
            <tec:Acceso>
               <tec:RFS>${rfsVal}</tec:RFS>
            </tec:Acceso>`;
  }).join('');

  const xmlRequest = `
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tec="http://com/tecnocom">
   <soap:Header/>
   <soap:Body>
      <tec:M6LiberarRecursos>
         <tec:FechaSolicitud>${fecha}</tec:FechaSolicitud>
         <tec:CodigoUnicoDireccion>${idDireccion}</tec:CodigoUnicoDireccion>
         <tec:EstadoPuerto>libre</tec:EstadoPuerto>
         <tec:Accesos>
            ${accesosXml}
         </tec:Accesos>
      </tec:M6LiberarRecursos>
   </soap:Body>
</soap:Envelope>`.trim();

  try {
    const response = await fetch(ENDPOINTS.LIBERAR, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/soap+xml;charset=UTF-8;action="urn:#M6LiberarRecursos"' 
      },
      body: xmlRequest
    });

    const xmlText = await response.text();
    const resultado = getTagValue(xmlText, 'Resultado');
    
    if (resultado !== 'OK') {
      const errorDesc = getTagValue(xmlText, 'DescripcionErrorResultado') || 'Error desconocido al liberar recursos.';
      throw new Error(errorDesc);
    }

    return true;
  } catch (error) {
    console.error('Error en liberarRecursos:', error.message);
    throw error;
  }
}
