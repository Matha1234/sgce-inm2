"""Génère un certificat HTTPS auto-signé pour le serveur SGCE-INM.

Utilisation (depuis le dossier du projet, PowerShell) :
  docker compose run --rm --no-deps -v "${PWD}/certs:/certs" -v "${PWD}/generer_certificat.py:/tmp/gen.py:ro" --entrypoint python backend /tmp/gen.py 192.168.1.10 sgce-inm.local

  - 1er argument : adresse IP du serveur sur le réseau interne
  - 2e argument  : nom de la machine ou nom DNS interne
Résultat : /certs/server.crt (à installer sur les postes clients) et /certs/server.key (à garder secret).
"""
import datetime
import ipaddress
import sys

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

if len(sys.argv) != 3:
    sys.exit("Usage : gen.py <adresse_ip_du_serveur> <nom_du_serveur>")

ip, nom = sys.argv[1], sys.argv[2]
ipaddress.ip_address(ip)  # échoue proprement si l'adresse IP est invalide

cle = rsa.generate_private_key(public_exponent=65537, key_size=2048)
sujet = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, nom)])
maintenant = datetime.datetime.now(datetime.timezone.utc)

cert = (
    x509.CertificateBuilder()
    .subject_name(sujet)
    .issuer_name(sujet)
    .public_key(cle.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(maintenant - datetime.timedelta(days=1))
    .not_valid_after(maintenant + datetime.timedelta(days=825))
    .add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName(nom),
            x509.DNSName("localhost"),
            x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
            x509.IPAddress(ipaddress.ip_address(ip)),
        ]),
        critical=False,
    )
    .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
    .add_extension(
        x509.KeyUsage(
            digital_signature=True, key_encipherment=True, key_cert_sign=True,
            content_commitment=False, data_encipherment=False, key_agreement=False,
            crl_sign=False, encipher_only=False, decipher_only=False,
        ),
        critical=True,
    )
    .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
    .sign(cle, hashes.SHA256())
)

with open("/certs/server.key", "wb") as f:
    f.write(cle.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption(),
    ))
with open("/certs/server.crt", "wb") as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))

print(f"Certificat généré pour {nom} / {ip} (valide 825 jours) : /certs/server.crt et /certs/server.key")
