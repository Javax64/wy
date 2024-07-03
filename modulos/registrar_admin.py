from database import agregar_usuario

def main():
    username = 'javax'  # Cambia esto por el nombre de usuario que desees
    password = '23deenerode1996'  # Cambia esto por la contraseña que desees
    role = 'admin'

    if agregar_usuario(username, password, role):
        print('Administrador registrado exitosamente')
    else:
        print('Error al registrar el administrador')

if __name__ == '__main__':
    main()
